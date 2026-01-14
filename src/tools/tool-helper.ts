// Tool Helper
// Creates tools compatible with our provider system

import { z } from "zod";
import type { ToolDefinition } from "../providers/types.js";

// =============================================================================
// Tool Creation Helper
// =============================================================================

interface ToolConfig<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  parameters: T;
  execute: (args: z.infer<T>) => Promise<any>;
}

/**
 * Create a tool definition compatible with our provider system
 */
export function defineTool<T extends z.ZodObject<any>>(
  config: ToolConfig<T>
): ToolDefinition {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: async (args: Record<string, any>) => {
      // Validate and parse args with Zod
      const parsed = config.parameters.parse(args);
      return config.execute(parsed);
    },
  };
}
