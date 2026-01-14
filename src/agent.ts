// Frink Agent - The intelligent orchestrator
// Supports both OpenAI (via Strands SDK) and Anthropic (native SDK)

import { createProvider, getApiKey, type ModelProvider, type ModelConfig, type ToolDefinition, type StreamEvent } from "./providers/index.js";
import { loadConfig, loadPrompt, type FrinkConfig } from "./config/index.js";
import { getAllTools } from "./tools/index.js";

// =============================================================================
// Types
// =============================================================================

export interface AgentOptions {
  promptPath?: string;
  workingDir?: string;
}

export interface RunCallbacks {
  onTextDelta?: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onToolResult?: (name: string, result: any) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Frink Agent
// =============================================================================

export class FrinkAgent {
  private provider: ModelProvider;
  private systemPrompt: string;
  private tools: ToolDefinition[];
  private config: FrinkConfig;

  constructor(options: AgentOptions = {}) {
    const { promptPath, workingDir } = options;

    this.config = loadConfig(workingDir);
    this.systemPrompt = loadPrompt(promptPath, workingDir);

    const apiKey = getApiKey(this.config.provider);
    if (!apiKey) {
      throw new Error(`No API key for ${this.config.provider}. Run 'frink setup'.`);
    }

    const modelConfig: ModelConfig = {
      provider: this.config.provider,
      apiKey,
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };

    this.provider = createProvider(modelConfig);
    this.tools = getAllTools(this.config.customTools, workingDir);
  }

  getProviderName(): string {
    return this.provider.name;
  }

  getModelName(): string {
    return this.config.model;
  }

  async *run(userPrompt: string, callbacks: RunCallbacks = {}): AsyncGenerator<StreamEvent, string, undefined> {
    const { onTextDelta, onToolCall, onToolResult, onError } = callbacks;
    let finalOutput = "";

    try {
      const generator = this.provider.run(this.systemPrompt, userPrompt, this.tools);

      for await (const event of generator) {
        switch (event.type) {
          case "text_delta":
            finalOutput += event.data.text;
            onTextDelta?.(event.data.text);
            break;
          case "tool_call_start":
            onToolCall?.(event.data.name, {});
            break;
          case "tool_call_end":
            onToolResult?.(event.data.name, event.data.arguments);
            break;
          case "error":
            onError?.(new Error(event.data.error));
            break;
        }
        yield event;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }

    return finalOutput;
  }

  async invoke(userPrompt: string): Promise<string> {
    const result = await this.provider.invoke(this.systemPrompt, userPrompt, this.tools);
    if (!result.success) throw new Error(result.output);
    return result.output;
  }
}
