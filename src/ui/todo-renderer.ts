// Todo List Renderer
// Handles terminal rendering of todo lists with in-place updates

import { c, clearLines } from "./theme.js";
import { Todo, TodoSummary, getStatusIcon, formatSummary } from "../state/todo-state.js";

// =============================================================================
// State
// =============================================================================

// Track rendered line count for clearing on update
let lastRenderedLineCount = 0;

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render the todo list to terminal with in-place updating
 */
export function renderTodoList(todos: Todo[], summary: TodoSummary): void {
  // Clear previous render if exists
  clearLines(lastRenderedLineCount);

  // Print header
  console.log(c.primary(`  [Todo] ${formatSummary(summary)}`));

  // Print each todo
  for (const todo of todos) {
    const icon = getStatusIcon(todo.status);
    console.log(c.muted(`  ${icon} ${todo.task}`));
  }

  // Track line count for next clear
  lastRenderedLineCount = todos.length + 1; // +1 for header
}

/**
 * Reset the render state (call when starting fresh)
 */
export function resetTodoRenderer(): void {
  lastRenderedLineCount = 0;
}

/**
 * Get the current rendered line count
 */
export function getRenderedLineCount(): number {
  return lastRenderedLineCount;
}
