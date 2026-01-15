// Configuration Types
// Type definitions for Frink configuration

// =============================================================================
// Custom Tool Configuration
// =============================================================================

export interface CustomToolParameter {
  name: string;
  description: string;
  required?: boolean;
}

export interface CustomToolConfig {
  name: string;
  description: string;
  command: string;
  parameters?: CustomToolParameter[];
}

// =============================================================================
// Frink Configuration
// =============================================================================

export type Provider = "openai" | "anthropic" | "zai";

export interface FrinkConfig {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  customTools?: CustomToolConfig[];
}

// =============================================================================
// Environment Configuration
// =============================================================================

export interface EnvironmentConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  zaiApiKey?: string;
  debug: boolean;
  maxIterations?: number;
  workingDirectory?: string;
}

// =============================================================================
// Save Configuration Options
// =============================================================================

export interface SaveConfigOptions {
  provider: Provider;
  model: string;
  apiKey: string;
  baseDir?: string;
}
