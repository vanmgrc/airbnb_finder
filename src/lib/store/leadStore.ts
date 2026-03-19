import {
  Lead,
  RawLead,
  QueueStats,
  UploadSession,
  LeadFilters,
  SortField,
  SortDirection,
  ProcessingStatus,
  ExportOptions,
} from '../types';

/**
 * In-memory store for managing leads during a session.
 * Singleton pattern -- persists across API calls within the same server process.
 */
class LeadStore {
  private sessions: Map<string, UploadSession> = new Map();
  private leads: Map<string, Lead> = new Map();
  private currentSessionId: string | null = null;

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  /**
   * Create a new upload session and set it as the current session.
   */
  createSession(filename: string, rawData: RawLead[], headers: string[]): UploadSession {
    const id = this.generateId();
    const session: UploadSession = {
      id,
      filename,
      rawData,
      headers,
      columnMapping: null,
      leads: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(id, session);
    this.currentSessionId = id;
    return session;
  }

  /**
   * Get a session by ID.
   */
  getSession(id: string): UploadSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * Get the current active session.
   */
  getCurrentSession(): UploadSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  // ---------------------------------------------------------------------------
  // Lead management
  // ---------------------------------------------------------------------------

  /**
   * Add an array of leads, associating them with a session.
   */
  addLeads(sessionId: string, leads: Lead[]): void {
    const session = this.sessions.get(sessionId);
    for (const lead of leads) {
      this.leads.set(lead.id, lead);
      if (session) {
        session.leads.push(lead);
      }
    }
  }

  /**
   * Get a single lead by ID.
   */
  getLead(id: string): Lead | null {
    return this.leads.get(id) || null;
  }

  /**
   * Update a lead with partial data. Returns the updated lead or null if not found.
   */
  updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const existing = this.leads.get(id);
    if (!existing) return null;

    const updated: Lead = {
      ...existing,
      ...updates,
      id: existing.id, // never allow ID to be overwritten
      updated_at: new Date().toISOString(),
    };
    this.leads.set(id, updated);

    // Also update the lead in its session's leads array
    for (const session of this.sessions.values()) {
      const idx = session.leads.findIndex((l) => l.id === id);
      if (idx !== -1) {
        session.leads[idx] = updated;
        break;
      }
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  /**
   * Get leads with optional filtering, sorting, and pagination.
   */
  getLeads(
    filters?: LeadFilters,
    sort?: { field: SortField; direction: SortDirection },
    page?: number,
    pageSize?: number
  ): { leads: Lead[]; total: number } {
    let result = Array.from(this.leads.values());

    // Apply filters
    if (filters) {
      result = this.applyFilters(result, filters);
    }

    const total = result.length;

    // Apply sorting
    if (sort) {
      result = this.applySorting(result, sort.field, sort.direction);
    }

    // Apply pagination
    if (page !== undefined && pageSize !== undefined) {
      const start = (page - 1) * pageSize;
      result = result.slice(start, start + pageSize);
    }

    return { leads: result, total };
  }

  /**
   * Get aggregate queue statistics.
   */
  getQueueStats(): QueueStats {
    const all = Array.from(this.leads.values());
    return {
      total: all.length,
      queueA: all.filter((l) => l.queue === 'A').length,
      queueB: all.filter((l) => l.queue === 'B').length,
      pending: all.filter((l) => l.processing_status === 'pending').length,
      processing: all.filter((l) => l.processing_status === 'processing').length,
      matched: all.filter((l) => l.processing_status === 'matched').length,
      probable_match: all.filter((l) => l.processing_status === 'probable_match').length,
      no_match: all.filter((l) => l.processing_status === 'no_match').length,
      needs_review: all.filter((l) => l.processing_status === 'needs_review').length,
      failed: all.filter((l) => l.processing_status === 'failed').length,
    };
  }

  /**
   * Get all leads in Queue A (have competitor URL).
   */
  getQueueALeads(): Lead[] {
    return Array.from(this.leads.values()).filter((l) => l.queue === 'A');
  }

  /**
   * Get all leads in Queue B (no competitor URL).
   */
  getQueueBLeads(): Lead[] {
    return Array.from(this.leads.values()).filter((l) => l.queue === 'B');
  }

  /**
   * Get pending leads, optionally filtered by queue.
   * Returns leads sorted with Queue A first if no queue is specified.
   */
  getPendingLeads(queue?: 'A' | 'B'): Lead[] {
    let pending = Array.from(this.leads.values()).filter(
      (l) => l.processing_status === 'pending'
    );

    if (queue) {
      pending = pending.filter((l) => l.queue === queue);
    } else {
      // Sort Queue A first
      pending.sort((a, b) => {
        if (a.queue === 'A' && b.queue === 'B') return -1;
        if (a.queue === 'B' && b.queue === 'A') return 1;
        return 0;
      });
    }

    return pending;
  }

  // ---------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------

  /**
   * Update the processing status of multiple leads at once.
   */
  bulkUpdateStatus(ids: string[], status: ProcessingStatus): void {
    const now = new Date().toISOString();
    for (const id of ids) {
      const lead = this.leads.get(id);
      if (lead) {
        const updated = { ...lead, processing_status: status, updated_at: now };
        this.leads.set(id, updated);
        this.updateLeadInSession(id, updated);
      }
    }
  }

  /**
   * Approve multiple leads at once (set review_decision to 'approved').
   */
  bulkApprove(ids: string[]): void {
    const now = new Date().toISOString();
    for (const id of ids) {
      const lead = this.leads.get(id);
      if (lead) {
        const updated = { ...lead, review_decision: 'approved' as const, updated_at: now };
        this.leads.set(id, updated);
        this.updateLeadInSession(id, updated);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Get all leads matching the export options' filters.
   */
  getAllLeadsForExport(options: ExportOptions): Lead[] {
    let result = Array.from(this.leads.values());

    if (options.statusFilter && options.statusFilter.length > 0) {
      result = result.filter((l) => options.statusFilter.includes(l.processing_status));
    }

    if (options.confidenceFilter && options.confidenceFilter.length > 0) {
      result = result.filter((l) => options.confidenceFilter.includes(l.confidence_label));
    }

    // Sort by confidence score descending for export
    result.sort((a, b) => b.confidence_score - a.confidence_score);

    return result;
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  /**
   * Clear all data from the store.
   */
  clear(): void {
    this.leads.clear();
    this.sessions.clear();
    this.currentSessionId = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private applyFilters(leads: Lead[], filters: LeadFilters): Lead[] {
    let result = leads;

    if (filters.status && filters.status.length > 0) {
      result = result.filter((l) => filters.status!.includes(l.processing_status));
    }

    if (filters.confidence && filters.confidence.length > 0) {
      result = result.filter((l) => filters.confidence!.includes(l.confidence_label));
    }

    if (filters.queue && filters.queue.length > 0) {
      result = result.filter((l) => filters.queue!.includes(l.queue));
    }

    if (filters.method && filters.method.length > 0) {
      result = result.filter((l) => filters.method!.includes(l.method_used));
    }

    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      result = result.filter((l) => l.rental_city.toLowerCase().includes(cityLower));
    }

    if (filters.state) {
      const stateLower = filters.state.toLowerCase();
      result = result.filter((l) => l.rental_state.toLowerCase().includes(stateLower));
    }

    if (filters.searchQuery) {
      const queryLower = filters.searchQuery.toLowerCase();
      result = result.filter((l) => {
        return (
          l.lead_id.toLowerCase().includes(queryLower) ||
          l.owner_name.toLowerCase().includes(queryLower) ||
          l.full_address.toLowerCase().includes(queryLower) ||
          l.rental_address.toLowerCase().includes(queryLower) ||
          l.rental_city.toLowerCase().includes(queryLower) ||
          l.notes.toLowerCase().includes(queryLower) ||
          l.final_airbnb_url.toLowerCase().includes(queryLower) ||
          l.competitor_listing_url.toLowerCase().includes(queryLower)
        );
      });
    }

    return result;
  }

  private applySorting(leads: Lead[], field: SortField, direction: SortDirection): Lead[] {
    const sorted = [...leads];
    const dir = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'confidence_score':
          comparison = a.confidence_score - b.confidence_score;
          break;
        case 'processing_status':
          comparison = a.processing_status.localeCompare(b.processing_status);
          break;
        case 'full_address':
          comparison = a.full_address.localeCompare(b.full_address);
          break;
        case 'method_used':
          comparison = a.method_used.localeCompare(b.method_used);
          break;
        case 'updated_at':
          comparison = a.updated_at.localeCompare(b.updated_at);
          break;
        default:
          comparison = 0;
      }

      return comparison * dir;
    });

    return sorted;
  }

  private updateLeadInSession(id: string, updated: Lead): void {
    for (const session of this.sessions.values()) {
      const idx = session.leads.findIndex((l) => l.id === id);
      if (idx !== -1) {
        session.leads[idx] = updated;
        break;
      }
    }
  }

  private generateId(): string {
    // Simple ID generation using timestamp + random suffix
    // In production, use uuid v4
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }
}

export const leadStore = new LeadStore();
