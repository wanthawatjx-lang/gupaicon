import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

export interface KeyStatus {
  index: number;
  masked: string;
  isCurrent: boolean;
  isRateLimited: boolean;
  cooldownRemainingMs: number;
}

export interface ClientStatus {
  totalKeys: number;
  currentActiveIndex: number;
  keys: KeyStatus[];
}

export interface GeminiMultiKeyClientOptions {
  apiKeys?: string[];
  cooldownMs?: number;
  timeoutMs?: number;
  userAgent?: string;
}

export declare function maskKey(key: string): string;
export declare function sanitizeError(err: any): string;
export declare function isRateLimitError(err: any): boolean;

export declare class GeminiMultiKeyClient {
  constructor(options?: GeminiMultiKeyClientOptions);
  cooldownMs: number;
  timeoutMs: number;
  userAgent: string;
  keys: string[];
  currentIndex: number;
  models: {
    generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
    generateContentStream(params: GenerateContentParameters): Promise<any>;
  };
  hasAvailableKey(): boolean;
  getKeyCount(): number;
  getStatus(): ClientStatus;
  rotateKey(reason?: string): number;
  getActiveClient(): GoogleGenAI;
  executeWithRotation<T>(operation: (client: GoogleGenAI) => Promise<T>): Promise<T>;
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  generateContentStream(params: GenerateContentParameters): Promise<any>;
}

export declare const geminiClient: GeminiMultiKeyClient;
export default geminiClient;
