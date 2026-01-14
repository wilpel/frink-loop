// Provider Module
// Factory and exports for model providers

import { OpenAIProvider } from "./openai-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import type {
  ModelProvider,
  ModelConfig,
  OpenAIConfig,
  AnthropicConfig,
  ToolDefinition,
  StreamEvent,
  AgentResult,
  Message,
  ToolCall,
} from "./types.js";

// =============================================================================
// Type Exports
// =============================================================================

export type {
  ModelProvider,
  ModelConfig,
  OpenAIConfig,
  AnthropicConfig,
  ToolDefinition,
  StreamEvent,
  AgentResult,
  Message,
  ToolCall,
};

// =============================================================================
// Provider Exports
// =============================================================================

export { OpenAIProvider, AnthropicProvider };

// =============================================================================
// Provider Factory
// =============================================================================

/**
 * Create a model provider based on configuration
 */
export function createProvider(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config as OpenAIConfig);
    case "anthropic":
      return new AnthropicProvider(config as AnthropicConfig);
    default:
      throw new Error(`Unknown provider: ${(config as any).provider}`);
  }
}

/**
 * Get API key from environment based on provider
 */
export function getApiKey(provider: "openai" | "anthropic"): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if API key is available for provider
 */
export function hasApiKeyForProvider(provider: "openai" | "anthropic"): boolean {
  return !!getApiKey(provider);
}

// =============================================================================
// Available Models
// =============================================================================

export const AVAILABLE_MODELS = {
  openai: [
    { id: "gpt-5.2", name: "GPT-5.2 (recommended)" },
    { id: "gpt-5.2-pro", name: "GPT-5.2 Pro" },
    { id: "gpt-5", name: "GPT-5" },
    { id: "gpt-5-mini", name: "GPT-5 Mini" },
    { id: "gpt-5-nano", name: "GPT-5 Nano" },
    { id: "gpt-5-pro", name: "GPT-5 Pro" },
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "o3", name: "o3" },
    { id: "o3-mini", name: "o3 Mini" },
    { id: "o4-mini", name: "o4 Mini" },
    { id: "o1", name: "o1" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5 (recommended)" },
    { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
  ],
};

/**
 * Check if a model is a reasoning model (GPT-5, o1, o3, o4)
 * Reasoning models don't support temperature, use max_completion_tokens instead
 */
export function isReasoningModel(model: string): boolean {
  return model.startsWith("gpt-5") ||
         model.startsWith("o1") ||
         model.startsWith("o3") ||
         model.startsWith("o4");
}

/**
 * Get default model for provider
 */
export function getDefaultModel(provider: "openai" | "anthropic"): string {
  return AVAILABLE_MODELS[provider][0].id;
}
