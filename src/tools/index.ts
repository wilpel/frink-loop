// Tools Module
// Aggregates all tools and provides utility functions

import { sendToClaudeTool } from "./send-to-claude.js";
import { todoWriteTool, todoReadTool, todoAddTool, todoUpdateTool, todoRemoveTool } from "./todo-tools.js";
import { gitStatusTool } from "./git-status.js";
import { readFileTool } from "./read-file.js";
import { markCompleteTool } from "./mark-complete.js";
import { resetClaudeSessionTool, setSessionConfig } from "./reset-session.js";
import { buildCustomTools } from "./custom-tools.js";

import { resetTodoState } from "../state/todo-state.js";
import { resetTodoRenderer } from "../ui/todo-renderer.js";
import type { CustomToolConfig } from "../config/index.js";
import type { ToolDefinition } from "../providers/types.js";

// =============================================================================
// Exports
// =============================================================================

export { setSessionConfig };

// =============================================================================
// Core Tools
// =============================================================================

export const coreTools: ToolDefinition[] = [
  sendToClaudeTool,
  todoWriteTool,
  todoReadTool,
  todoAddTool,
  todoUpdateTool,
  todoRemoveTool,
  gitStatusTool,
  readFileTool,
  markCompleteTool,
  resetClaudeSessionTool,
];

// =============================================================================
// Get All Tools
// =============================================================================

export function getAllTools(customToolConfigs?: CustomToolConfig[], workingDir?: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [...coreTools];

  if (customToolConfigs?.length && workingDir) {
    tools.push(...buildCustomTools(customToolConfigs, workingDir));
  }

  return tools;
}

// =============================================================================
// Reset
// =============================================================================

export function resetTools(): void {
  resetTodoState();
  resetTodoRenderer();
}
