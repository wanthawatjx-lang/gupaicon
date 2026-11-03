import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

export interface GeminiClientOptions {
  timeoutMs?: number;
  userAgent?: string;
}

export declare function sanitizeError(err: any): string;
export declare function isRateLimitError(err: any): boolean;

export declare class GeminiClient {
  constructor(options?: GeminiClientOptions);
  timeoutMs: number;
  userAgent: string;
  models: {
    generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
    generateContentStream(params: GenerateContentParameters): Promise<any>;
  };
  hasAvailableKey(): boolean;
  execute<T>(operation: (client: GoogleGenAI) => Promise<T>): Promise<T>;
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  generateContentStream(params: GenerateContentParameters): Promise<any>;
}

export declare const geminiClient: GeminiClient;
export default geminiClient;
