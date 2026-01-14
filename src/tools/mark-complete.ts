// Mark Complete Tool
// Signal task completion

import { z } from "zod";
import { confirm, input } from "@inquirer/prompts";
import { defineTool } from "./tool-helper.js";
import { c, colors } from "../ui/theme.js";
import { getTodoSummary, getTodos } from "../state/todo-state.js";

export const markCompleteTool = defineTool({
  name: "mark_task_complete",
  description: `Call this when the ENTIRE task is complete. Only call this when:
- All todos are completed
- Changes have been verified
- The original request is fully satisfied

WARNING: This will FAIL if there are incomplete tasks. Complete all tasks first!

Include a summary of what was accomplished.`,
  parameters: z.object({
    summary: z.string().describe("Summary of what was accomplished"),
    success: z.boolean().describe("Whether the task was successful"),
  }),
  execute: async ({ summary, success }) => {
    const todoSummary = getTodoSummary();
    const todos = getTodos();

    // Check if there are incomplete tasks
    const incompleteTasks = todos.filter(t => t.status !== "completed");

    if (incompleteTasks.length > 0) {
      console.log();
      console.log(c.warning("  [!!] Cannot complete - tasks remaining:"));
      for (const task of incompleteTasks) {
        console.log(c.muted(`       [${task.status}] ${task.task}`));
      }
      console.log();

      return {
        complete: false,
        success: false,
        error: "You need to finish all the tasks before done",
        remainingTasks: incompleteTasks.map(t => ({ id: t.id, task: t.task, status: t.status })),
        todoSummary: {
          total: todoSummary.total,
          completed: todoSummary.completed,
          remaining: incompleteTasks.length,
        },
      };
    }

    // All tasks done - ask user for confirmation
    console.log();
    console.log(c.muted(`  ${"=".repeat(50)}`));
    console.log(c.primary("  [*] All tasks completed"));
    console.log(c.muted(`  ${summary}`));
    console.log(c.muted(`  ${"=".repeat(50)}`));
    console.log();

    try {
      const userConfirmed = await confirm({
        message: colors.primary("Is everything done? Confirm to finish:"),
        default: true,
      });

      if (!userConfirmed) {
        // Ask user what's wrong or what else needs to be done
        const feedback = await input({
          message: colors.primary("What else needs to be done?"),
        });

        console.log(c.muted("\n  User requested more work.\n"));

        return {
          complete: false,
          success: false,
          error: "User indicated more work is needed.",
          userFeedback: feedback || "User did not specify, ask what they need.",
          todoSummary: {
            total: todoSummary.total,
            completed: todoSummary.completed,
          },
        };
      }

      console.log(c.primary("\n  [*] TASK COMPLETED - User confirmed\n"));

      return {
        complete: true,
        success,
        summary,
        userConfirmed: true,
        todoSummary: {
          total: todoSummary.total,
          completed: todoSummary.completed,
        },
      };
    } catch (error: any) {
      // Handle Ctrl+C
      if (error.name === "ExitPromptError") {
        console.log(c.muted("\n  Interrupted by user.\n"));
        return {
          complete: true,
          success: false,
          summary: "Interrupted by user",
          userConfirmed: false,
        };
      }
      throw error;
    }
  },
});
