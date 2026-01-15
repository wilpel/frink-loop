// Provider Types
// Common interfaces for all model providers

import { z } from "zod";

// =============================================================================
// Tool Types
// =============================================================================

export interface ToolParameter {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (args: Record<string, any>) => Promise<any>;
}

// =============================================================================
// Message Types
// =============================================================================

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
}

// =============================================================================
// Stream Event Types
// =============================================================================

export type StreamEventType =
  | "text_delta"
  | "tool_call_start"
  | "tool_call_delta"
  | "tool_call_end"
  | "message_start"
  | "message_end"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  data: any;
}

export interface TextDeltaEvent extends StreamEvent {
  type: "text_delta";
  data: { text: string };
}

export interface ToolCallStartEvent extends StreamEvent {
  type: "tool_call_start";
  data: { id: string; name: string };
}

export interface ToolCallDeltaEvent extends StreamEvent {
  type: "tool_call_delta";
  data: { id: string; arguments: string };
}

export interface ToolCallEndEvent extends StreamEvent {
  type: "tool_call_end";
  data: { id: string; name: string; arguments: Record<string, any> };
}

// =============================================================================
// Provider Configuration
// =============================================================================

export interface ProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIConfig extends ProviderConfig {
  provider: "openai";
  baseUrl?: string;
}

export interface AnthropicConfig extends ProviderConfig {
  provider: "anthropic";
  baseUrl?: string;
}

export interface ZaiConfig extends ProviderConfig {
  provider: "zai";
}

export type ModelConfig = OpenAIConfig | AnthropicConfig | ZaiConfig;

// =============================================================================
// Agent Result
// =============================================================================

export interface AgentResult {
  success: boolean;
  output: string;
  toolCalls: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// =============================================================================
// Provider Interface
// =============================================================================

export interface ModelProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Run the agent with a prompt and tools
   * Returns an async generator of stream events
   */
  run(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    messages?: Message[]
  ): AsyncGenerator<StreamEvent, AgentResult, undefined>;

  /**
   * Execute a single turn without streaming
   */
  invoke(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    messages?: Message[]
  ): Promise<AgentResult>;
}
