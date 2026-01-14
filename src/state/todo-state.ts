// Todo State Manager
// Centralized state management for task tracking

// =============================================================================
// Types
// =============================================================================

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Todo {
  id: number;
  task: string;
  status: TodoStatus;
}

export interface TodoSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface TodoInput {
  task: string;
  status: TodoStatus;
}

// =============================================================================
// State
// =============================================================================

let todos: Todo[] = [];
let nextTodoId = 1;

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get all todos
 */
export function getTodos(): Todo[] {
  return [...todos];
}

/**
 * Get todo summary statistics
 */
export function getTodoSummary(): TodoSummary {
  return {
    total: todos.length,
    pending: todos.filter(t => t.status === "pending").length,
    inProgress: todos.filter(t => t.status === "in_progress").length,
    completed: todos.filter(t => t.status === "completed").length,
    failed: todos.filter(t => t.status === "failed").length,
  };
}

/**
 * Get a single todo by ID
 */
export function getTodoById(id: number): Todo | undefined {
  return todos.find(t => t.id === id);
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Replace the entire todo list
 * Returns the updated todos and summary
 */
export function setTodos(newTodos: TodoInput[]): { todos: Todo[]; summary: TodoSummary } {
  todos = newTodos.map((t, i) => ({
    id: i + 1,
    task: t.task,
    status: t.status,
  }));
  nextTodoId = todos.length + 1;

  return {
    todos: getTodos(),
    summary: getTodoSummary(),
  };
}

/**
 * Add a single todo
 */
export function addTodo(task: string, status: TodoStatus = "pending"): Todo {
  const todo: Todo = {
    id: nextTodoId++,
    task,
    status,
  };
  todos.push(todo);
  return todo;
}

/**
 * Update a todo's status by ID
 */
export function updateTodoStatus(id: number, status: TodoStatus): Todo | undefined {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.status = status;
  }
  return todo;
}

/**
 * Update a todo's task description by ID
 */
export function updateTodoTask(id: number, task: string): Todo | undefined {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.task = task;
  }
  return todo;
}

/**
 * Remove a todo by ID
 */
export function removeTodo(id: number): boolean {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    todos.splice(index, 1);
    return true;
  }
  return false;
}

// =============================================================================
// Reset
// =============================================================================

/**
 * Reset all todo state
 */
export function resetTodoState(): void {
  todos = [];
  nextTodoId = 1;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Get status icon for a todo
 */
export function getStatusIcon(status: TodoStatus): string {
  switch (status) {
    case "completed":
      return "[x]";
    case "in_progress":
      return "[~]";
    case "failed":
      return "[!]";
    case "pending":
    default:
      return "[ ]";
  }
}

/**
 * Format a todo for display
 */
export function formatTodo(todo: Todo): string {
  return `${getStatusIcon(todo.status)} ${todo.task}`;
}

/**
 * Format summary for display
 */
export function formatSummary(summary: TodoSummary): string {
  return `${summary.completed}/${summary.total} complete`;
}
