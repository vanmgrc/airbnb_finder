import { VisionProvider } from '../types';

/**
 * MockVisionProvider returns deterministic but varied similarity scores
 * and feature lists for testing purposes.
 */
export class MockVisionProvider implements VisionProvider {
  name = 'mock';

  async compareImages(imageA: string, imageB: string): Promise<number> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate a deterministic score based on the two URLs
    const combined = imageA + imageB;
    const hash = this.simpleHash(combined);

    // Produce a score between 0.1 and 0.95
    const score = 0.1 + (hash % 85) / 100;
    return Math.round(score * 100) / 100;
  }

  async extractFeatures(imageUrl: string): Promise<string[]> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const hash = this.simpleHash(imageUrl);

    // Pool of possible visual features
    const allFeatures = [
      'modern kitchen',
      'hardwood floors',
      'open floor plan',
      'natural lighting',
      'swimming pool',
      'outdoor patio',
      'stone fireplace',
      'vaulted ceiling',
      'stainless steel appliances',
      'granite countertops',
      'large windows',
      'mountain view',
      'ocean view',
      'garden area',
      'wooden deck',
      'hot tub',
      'minimalist decor',
      'rustic style',
      'coastal theme',
      'contemporary furniture',
      'king bed',
      'double vanity bathroom',
      'walk-in shower',
      'balcony',
      'garage',
    ];

    // Select 4-8 features deterministically based on the URL hash
    const count = 4 + (hash % 5);
    const features: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (hash + i * 7) % allFeatures.length;
      const feature = allFeatures[idx];
      if (!features.includes(feature)) {
        features.push(feature);
      }
    }

    return features;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * AIVisionProvider stub for future integration with AI vision models
 * such as Claude Vision or GPT-4V for image comparison and feature extraction.
 */
export class AIVisionProvider implements VisionProvider {
  name = 'ai-vision';

  private apiKey: string;
  private modelProvider: string;

  constructor() {
    this.apiKey = process.env.VISION_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';
    this.modelProvider = process.env.VISION_MODEL_PROVIDER || 'anthropic';
  }

  async compareImages(imageA: string, imageB: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error(
        'Vision API key not configured. Set VISION_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY environment variable.'
      );
    }

    if (this.modelProvider === 'anthropic') {
      return this.compareWithClaude(imageA, imageB);
    } else if (this.modelProvider === 'openai') {
      return this.compareWithGPT4V(imageA, imageB);
    }

    throw new Error(`Unsupported vision model provider: ${this.modelProvider}`);
  }

  async extractFeatures(imageUrl: string): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error(
        'Vision API key not configured. Set VISION_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY environment variable.'
      );
    }

    if (this.modelProvider === 'anthropic') {
      return this.extractWithClaude(imageUrl);
    } else if (this.modelProvider === 'openai') {
      return this.extractWithGPT4V(imageUrl);
    }

    throw new Error(`Unsupported vision model provider: ${this.modelProvider}`);
  }

  private async compareWithClaude(imageA: string, imageB: string): Promise<number> {
    // TODO: Implement Claude Vision API call
    // 1. Send both images to Claude with a prompt asking for similarity assessment
    // 2. Parse the response for a numeric similarity score
    // 3. Expected prompt: "Compare these two property listing images.
    //    Rate their similarity from 0.0 to 1.0 considering layout, style, and features."
    throw new Error(
      `Claude Vision comparison not yet implemented for images: ${imageA}, ${imageB}. ` +
      'Implement the Anthropic Messages API with image content blocks.'
    );
  }

  private async compareWithGPT4V(imageA: string, imageB: string): Promise<number> {
    // TODO: Implement GPT-4V API call
    // 1. Send both images to GPT-4V with a comparison prompt
    // 2. Parse the response for a numeric similarity score
    throw new Error(
      `GPT-4V comparison not yet implemented for images: ${imageA}, ${imageB}. ` +
      'Implement the OpenAI Chat Completions API with image_url content.'
    );
  }

  private async extractWithClaude(imageUrl: string): Promise<string[]> {
    // TODO: Implement Claude Vision feature extraction
    // 1. Send the image to Claude with a prompt asking to list visual features
    // 2. Parse the response into a string array of features
    // 3. Expected prompt: "List the key visual features of this property listing photo.
    //    Include architectural style, room type, notable amenities, and decor elements."
    throw new Error(
      `Claude Vision feature extraction not yet implemented for: ${imageUrl}. ` +
      'Implement the Anthropic Messages API with image content blocks.'
    );
  }

  private async extractWithGPT4V(imageUrl: string): Promise<string[]> {
    // TODO: Implement GPT-4V feature extraction
    throw new Error(
      `GPT-4V feature extraction not yet implemented for: ${imageUrl}. ` +
      'Implement the OpenAI Chat Completions API with image_url content.'
    );
  }
}

/**
 * Factory function to get the configured vision provider.
 * Uses the VISION_PROVIDER environment variable.
 * Defaults to 'mock' if not set.
 */
export function getVisionProvider(): VisionProvider {
  const provider = process.env.VISION_PROVIDER || 'mock';
  switch (provider) {
    case 'ai':
    case 'ai-vision':
      return new AIVisionProvider();
    case 'mock':
    default:
      return new MockVisionProvider();
  }
}
