// Todo Management Tools
// Tools for tracking task progress

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import {
  setTodos,
  getTodos,
  getTodoSummary,
  addTodo,
  updateTodoStatus,
  removeTodo,
  type TodoStatus,
} from "../state/todo-state.js";
import { renderTodoList } from "../ui/todo-renderer.js";

export const todoWriteTool = defineTool({
  name: "todo_write",
  description: `Update the task list. Use this to:
- Add new tasks discovered during work
- Mark tasks as in_progress when starting them
- Mark tasks as completed when done
- Mark tasks as failed if they can't be completed

Keep the todo list updated to track progress.`,
  parameters: z.object({
    todos: z.array(z.object({
      task: z.string().describe("Description of the task"),
      status: z.enum(["pending", "in_progress", "completed", "failed"]).describe("Task status"),
    })).describe("The complete updated todo list"),
  }),
  execute: async ({ todos: newTodos }) => {
    // Update state
    const { todos, summary } = setTodos(
      newTodos.map((t: { task: string; status: string }) => ({
        task: t.task,
        status: t.status as TodoStatus,
      }))
    );

    // Render to terminal
    renderTodoList(todos, summary);

    return { success: true, summary, todos };
  },
});

export const todoReadTool = defineTool({
  name: "todo_read",
  description: "Read the current todo list to see task progress",
  parameters: z.object({}),
  execute: async () => {
    return {
      todos: getTodos(),
      summary: getTodoSummary(),
    };
  },
});

export const todoAddTool = defineTool({
  name: "todo_add",
  description: `Add new tasks to the existing todo list without replacing the whole list.
Use this when you discover additional work needed during execution.
This preserves existing tasks and their statuses.`,
  parameters: z.object({
    tasks: z.array(z.object({
      task: z.string().describe("Description of the new task"),
      status: z.enum(["pending", "in_progress"]).default("pending").describe("Initial status (usually pending)"),
    })).describe("New tasks to add"),
  }),
  execute: async ({ tasks }) => {
    // Add each new task
    const addedTodos = tasks.map(t => addTodo(t.task, (t.status || "pending") as TodoStatus));

    // Re-render the list
    const todos = getTodos();
    const summary = getTodoSummary();
    renderTodoList(todos, summary);

    return {
      success: true,
      added: addedTodos,
      summary,
      todos,
    };
  },
});

export const todoUpdateTool = defineTool({
  name: "todo_update",
  description: `Update the status of a specific task by its ID.
Use this for quick status changes without rewriting the whole list.`,
  parameters: z.object({
    id: z.number().describe("The ID of the task to update"),
    status: z.enum(["pending", "in_progress", "completed", "failed"]).describe("New status"),
  }),
  execute: async ({ id, status }) => {
    const updated = updateTodoStatus(id, status as TodoStatus);

    if (!updated) {
      return {
        success: false,
        error: `Task with ID ${id} not found`,
      };
    }

    // Re-render the list
    const todos = getTodos();
    const summary = getTodoSummary();
    renderTodoList(todos, summary);

    return {
      success: true,
      updated,
      summary,
    };
  },
});

export const todoRemoveTool = defineTool({
  name: "todo_remove",
  description: `Remove a task from the todo list by its ID.
Use this when a task is no longer relevant or was added by mistake.`,
  parameters: z.object({
    id: z.number().describe("The ID of the task to remove"),
  }),
  execute: async ({ id }) => {
    const removed = removeTodo(id);

    if (!removed) {
      return {
        success: false,
        error: `Task with ID ${id} not found`,
      };
    }

    // Re-render the list
    const todos = getTodos();
    const summary = getTodoSummary();
    renderTodoList(todos, summary);

    return {
      success: true,
      removedId: id,
      summary,
      todos,
    };
  },
});
