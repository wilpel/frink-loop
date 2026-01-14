// OpenAI Provider
// Uses Strands Agents SDK with OpenAI model

import { Agent, tool } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/openai";
import { z } from "zod";
import type {
  ModelProvider,
  OpenAIConfig,
  ToolDefinition,
  StreamEvent,
  AgentResult,
  Message,
  ToolCall,
} from "./types.js";
import { isReasoningModel } from "./index.js";

// =============================================================================
// OpenAI Provider Implementation
// =============================================================================

export class OpenAIProvider implements ModelProvider {
  readonly name = "openai";
  private config: OpenAIConfig;
  private model: OpenAIModel;

  constructor(config: OpenAIConfig) {
    this.config = config;

    // Reasoning models (GPT-5, o1, o3, o4) don't support temperature
    const isReasoning = isReasoningModel(config.model);

    this.model = new OpenAIModel({
      apiKey: config.apiKey,
      modelId: config.model,
      // Reasoning models use max_completion_tokens internally
      maxTokens: config.maxTokens || (isReasoning ? 16384 : 4096),
      // Only set temperature for non-reasoning models
      ...(isReasoning ? {} : { temperature: config.temperature || 0.7 }),
      ...(config.baseUrl && {
        clientConfig: { baseURL: config.baseUrl },
      }),
    });
  }

  /**
   * Convert our tool definitions to Strands tool format
   */
  private convertTools(tools: ToolDefinition[]) {
    return tools.map((t) =>
      tool({
        name: t.name,
        description: t.description,
        inputSchema: t.parameters,
        callback: async (input: Record<string, any>) => {
          const result = await t.execute(input);
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      })
    );
  }

  /**
   * Run the agent with streaming
   */
  async *run(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    messages: Message[] = []
  ): AsyncGenerator<StreamEvent, AgentResult, undefined> {
    const strandsTools = this.convertTools(tools);

    const agent = new Agent({
      model: this.model,
      systemPrompt,
      tools: strandsTools,
      printer: false, // Disable automatic printing
    });

    const collectedToolCalls: ToolCall[] = [];
    let outputText = "";

    try {
      // Stream the agent response
      for await (const event of agent.stream(userPrompt)) {
        // Handle different Strands SDK event types
        switch (event.type) {
          case "modelMessageStartEvent":
            yield { type: "message_start", data: {} };
            break;

          case "modelContentBlockStartEvent":
            // Content block started (tool use info comes via beforeToolCallEvent)
            break;

          case "modelContentBlockDeltaEvent":
            // Text or tool input delta
            if (event.delta) {
              const delta = event.delta as any;
              if ("text" in delta) {
                outputText += delta.text;
                yield {
                  type: "text_delta",
                  data: { text: delta.text },
                };
              }
            }
            break;

          case "modelContentBlockStopEvent":
            // Content block finished
            break;

          case "modelMessageStopEvent":
            yield { type: "message_end", data: {} };
            break;

          case "beforeToolCallEvent":
            // Tool is about to be called
            const beforeTool = event as any;
            if (beforeTool.toolUse) {
              const toolCall: ToolCall = {
                id: beforeTool.toolUse.id || `tool_${Date.now()}`,
                name: beforeTool.toolUse.name,
                arguments: beforeTool.toolUse.input || {},
              };
              collectedToolCalls.push(toolCall);
              yield {
                type: "tool_call_start",
                data: { id: toolCall.id, name: toolCall.name },
              };
            }
            break;

          case "afterToolCallEvent":
            // Tool call finished
            const afterTool = event as any;
            if (afterTool.toolUse) {
              yield {
                type: "tool_call_end",
                data: {
                  id: afterTool.toolUse.id || "",
                  name: afterTool.toolUse.name,
                  arguments: afterTool.toolUse.input || {},
                },
              };
            }
            break;

          case "agentResult":
            // Final result
            const result = event as any;
            outputText = result.toString?.() || outputText;
            break;
        }
      }

      return {
        success: true,
        output: outputText,
        toolCalls: collectedToolCalls,
      };
    } catch (error) {
      yield {
        type: "error",
        data: { error: (error as Error).message },
      };

      return {
        success: false,
        output: (error as Error).message,
        toolCalls: collectedToolCalls,
      };
    }
  }

  /**
   * Execute without streaming
   */
  async invoke(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    messages: Message[] = []
  ): Promise<AgentResult> {
    const strandsTools = this.convertTools(tools);

    const agent = new Agent({
      model: this.model,
      systemPrompt,
      tools: strandsTools,
      printer: false,
    });

    try {
      const result = await agent.invoke(userPrompt);

      return {
        success: true,
        output: typeof result === "string" ? result : JSON.stringify(result),
        toolCalls: [],
      };
    } catch (error) {
      return {
        success: false,
        output: (error as Error).message,
        toolCalls: [],
      };
    }
  }
}
