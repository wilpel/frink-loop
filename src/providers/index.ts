// Provider Module
// Factory and exports for model providers

import { OpenAIProvider } from "./openai-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import type { ModelProvider, ModelConfig, OpenAIConfig, AnthropicConfig, ZaiConfig } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./models.js";

// Re-export providers
export { OpenAIProvider, AnthropicProvider };

// =============================================================================
// Provider Factory
// =============================================================================

export function createProvider(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config as OpenAIConfig);
    case "anthropic":
      return new AnthropicProvider(config as AnthropicConfig);
    case "zai":
      return new AnthropicProvider({
        ...config,
        provider: "anthropic",
        baseUrl: "https://api.z.ai/api/anthropic",
      } as AnthropicConfig);
    default:
      throw new Error(`Unknown provider: ${(config as any).provider}`);
  }
}

// =============================================================================
// API Key Utilities
// =============================================================================

export function getApiKey(provider: "openai" | "anthropic" | "zai"): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "zai":
      return process.env.ZAI_API_KEY;
    default:
      return undefined;
  }
}

export function hasApiKeyForProvider(provider: "openai" | "anthropic" | "zai"): boolean {
  return !!getApiKey(provider);
}
