// Anthropic Provider
// Custom implementation using @anthropic-ai/sdk

import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelProvider,
  AnthropicConfig,
  ToolDefinition,
  StreamEvent,
  AgentResult,
  Message,
  ToolCall,
} from "./types.js";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert Zod schema to Anthropic tool input schema
 */
function zodToJsonSchema(schema: any): Record<string, any> {
  // Get the shape from Zod schema
  if (schema._def?.typeName === "ZodObject") {
    const shape = schema._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldDef = (value as any)._def;
      properties[key] = {
        type: getZodType(fieldDef),
        description: fieldDef.description || "",
      };

      // Check if required (not optional)
      if (fieldDef.typeName !== "ZodOptional") {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: "object", properties: {} };
}

/**
 * Get JSON Schema type from Zod type
 */
function getZodType(def: any): string {
  const typeName = def?.typeName || def?.innerType?._def?.typeName;

  switch (typeName) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodArray":
      return "array";
    case "ZodObject":
      return "object";
    case "ZodOptional":
      return getZodType(def.innerType._def);
    case "ZodDefault":
      return getZodType(def.innerType._def);
    case "ZodEnum":
      return "string";
    default:
      return "string";
  }
}

// =============================================================================
// Anthropic Provider Implementation
// =============================================================================

export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  private config: AnthropicConfig;
  private client: Anthropic;

  constructor(config: AnthropicConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Convert our tool definitions to Anthropic tool format
   */
  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: zodToJsonSchema(t.parameters) as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Convert messages to Anthropic format
   */
  private convertMessages(
    messages: Message[]
  ): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  /**
   * Run the agent with streaming - implements agentic loop
   */
  async *run(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    initialMessages: Message[] = []
  ): AsyncGenerator<StreamEvent, AgentResult, undefined> {
    const anthropicTools = this.convertTools(tools);
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    // Build conversation history
    const messages: Anthropic.MessageParam[] = [
      ...this.convertMessages(initialMessages),
      { role: "user", content: userPrompt },
    ];

    const collectedToolCalls: ToolCall[] = [];
    let outputText = "";
    let continueLoop = true;

    yield { type: "message_start", data: {} };

    while (continueLoop) {
      try {
        // Create streaming message
        const stream = this.client.messages.stream({
          model: this.config.model,
          max_tokens: this.config.maxTokens || 4096,
          temperature: this.config.temperature || 0.7,
          system: systemPrompt,
          messages,
          tools: anthropicTools,
        });

        let currentToolId = "";
        let currentToolName = "";
        let currentToolArgs = "";
        const pendingToolCalls: {
          id: string;
          name: string;
          input: Record<string, any>;
        }[] = [];

        // Process stream events
        for await (const event of stream) {
          if (event.type === "content_block_start") {
            const block = event.content_block as any;

            if (block.type === "text") {
              // Text block starting
            } else if (block.type === "tool_use") {
              currentToolId = block.id;
              currentToolName = block.name;
              currentToolArgs = "";

              yield {
                type: "tool_call_start",
                data: { id: currentToolId, name: currentToolName },
              };
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta as any;

            if (delta.type === "text_delta") {
              outputText += delta.text;
              yield {
                type: "text_delta",
                data: { text: delta.text },
              };
            } else if (delta.type === "input_json_delta") {
              currentToolArgs += delta.partial_json;
              yield {
                type: "tool_call_delta",
                data: { id: currentToolId, arguments: delta.partial_json },
              };
            }
          } else if (event.type === "content_block_stop") {
            // If we were building a tool call, complete it
            if (currentToolId && currentToolName) {
              let parsedArgs: Record<string, any> = {};
              try {
                parsedArgs = currentToolArgs ? JSON.parse(currentToolArgs) : {};
              } catch {
                parsedArgs = {};
              }

              const toolCall: ToolCall = {
                id: currentToolId,
                name: currentToolName,
                arguments: parsedArgs,
              };
              collectedToolCalls.push(toolCall);
              pendingToolCalls.push({
                id: currentToolId,
                name: currentToolName,
                input: parsedArgs,
              });

              yield {
                type: "tool_call_end",
                data: {
                  id: currentToolId,
                  name: currentToolName,
                  arguments: parsedArgs,
                },
              };

              currentToolId = "";
              currentToolName = "";
              currentToolArgs = "";
            }
          } else if (event.type === "message_stop") {
            // Message complete
          }
        }

        // Get final message to check stop reason
        const finalMessage = await stream.finalMessage();

        // If there are tool calls, execute them and continue the loop
        if (pendingToolCalls.length > 0) {
          // Add assistant message with tool use
          messages.push({
            role: "assistant",
            content: finalMessage.content,
          });

          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolCall of pendingToolCalls) {
            const toolDef = toolMap.get(toolCall.name);
            if (toolDef) {
              try {
                const result = await toolDef.execute(toolCall.input);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content:
                    typeof result === "string"
                      ? result
                      : JSON.stringify(result),
                });
              } catch (error) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: `Error: ${(error as Error).message}`,
                  is_error: true,
                });
              }
            }
          }

          // Add tool results as user message
          messages.push({
            role: "user",
            content: toolResults,
          });

          // Continue the loop
          continueLoop = true;
        } else {
          // No more tool calls, we're done
          continueLoop = false;
        }
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

    yield { type: "message_end", data: {} };

    return {
      success: true,
      output: outputText,
      toolCalls: collectedToolCalls,
    };
  }

  /**
   * Execute without streaming
   */
  async invoke(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolDefinition[],
    initialMessages: Message[] = []
  ): Promise<AgentResult> {
    const anthropicTools = this.convertTools(tools);
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    const messages: Anthropic.MessageParam[] = [
      ...this.convertMessages(initialMessages),
      { role: "user", content: userPrompt },
    ];

    const collectedToolCalls: ToolCall[] = [];
    let outputText = "";
    let continueLoop = true;

    while (continueLoop) {
      try {
        const response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens || 4096,
          temperature: this.config.temperature || 0.7,
          system: systemPrompt,
          messages,
          tools: anthropicTools,
        });

        // Process response content
        const pendingToolCalls: {
          id: string;
          name: string;
          input: Record<string, any>;
        }[] = [];

        for (const block of response.content) {
          if (block.type === "text") {
            outputText += block.text;
          } else if (block.type === "tool_use") {
            const toolCall: ToolCall = {
              id: block.id,
              name: block.name,
              arguments: block.input as Record<string, any>,
            };
            collectedToolCalls.push(toolCall);
            pendingToolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, any>,
            });
          }
        }

        // If there are tool calls, execute them
        if (pendingToolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: response.content,
          });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolCall of pendingToolCalls) {
            const toolDef = toolMap.get(toolCall.name);
            if (toolDef) {
              try {
                const result = await toolDef.execute(toolCall.input);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content:
                    typeof result === "string"
                      ? result
                      : JSON.stringify(result),
                });
              } catch (error) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: `Error: ${(error as Error).message}`,
                  is_error: true,
                });
              }
            }
          }

          messages.push({
            role: "user",
            content: toolResults,
          });

          continueLoop = true;
        } else {
          continueLoop = false;
        }
      } catch (error) {
        return {
          success: false,
          output: (error as Error).message,
          toolCalls: collectedToolCalls,
        };
      }
    }

    return {
      success: true,
      output: outputText,
      toolCalls: collectedToolCalls,
    };
  }
}
