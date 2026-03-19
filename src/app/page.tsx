'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import FileUploader from '@/components/upload/FileUploader';
import DataPreview from '@/components/upload/DataPreview';
import ColumnMapper from '@/components/upload/ColumnMapper';
import { ColumnMapping, RawLead } from '@/lib/types';

type Step = 'upload' | 'preview' | 'mapping';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<RawLead[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [suggestedMapping, setSuggestedMapping] = useState<ColumnMapping | null>(null);

  async function handleFileSelected(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSessionId(data.sessionId);
      setHeaders(data.headers);
      setPreview(data.preview);
      setTotalRows(data.totalRows);
      setSuggestedMapping(data.suggestedMapping);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMappingComplete(mapping: ColumnMapping) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, columnMapping: mapping }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Processing failed to start');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start processing');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAutoDetect() {
    // suggestedMapping is already auto-detected from upload response
    // This just forces a re-render with it
    setSuggestedMapping({ ...suggestedMapping });
  }

  const stepNumber = step === 'upload' ? 1 : step === 'preview' ? 2 : 3;

  return (
    <div className="h-full flex flex-col">
      <Header title="Upload Leads" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { n: 1, label: 'Upload File' },
            { n: 2, label: 'Preview Data' },
            { n: 3, label: 'Map Columns' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                  n <= stepNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n}
              </span>
              <span className={`text-sm font-medium ${n <= stepNumber ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
              {n < 3 && <div className="w-12 h-px bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <FileUploader onFileSelected={handleFileSelected} isLoading={isLoading} />
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <DataPreview headers={headers} data={preview} totalRows={totalRows} />
            <div className="flex justify-end">
              <button
                onClick={() => setStep('mapping')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Continue to Column Mapping
              </button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <ColumnMapper
            headers={headers}
            initialMapping={suggestedMapping}
            onMappingComplete={handleMappingComplete}
            onAutoDetect={handleAutoDetect}
          />
        )}

        {isLoading && step === 'mapping' && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Creating leads and starting processing...
          </div>
        )}
      </div>
    </div>
  );
}
