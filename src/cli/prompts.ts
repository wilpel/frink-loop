// Interactive CLI Prompts
// TUI input for Frink Loop

import { input, confirm } from "@inquirer/prompts";
import { colors } from "./ui.js";

export interface TaskInput {
  task: string;
  workingDir: string;
}

// Main task input prompt
export async function promptForTask(defaultDir: string): Promise<TaskInput | null> {
  console.log();

  try {
    const task = await input({
      message: colors.primary("[>] Task:"),
      validate: (value: string) => value.trim() ? true : "Please enter a task",
    });

    return { task, workingDir: defaultDir };
  } catch (error: any) {
    if (error.name === "ExitPromptError") {
      return null;
    }
    throw error;
  }
}

// Confirm before starting
export async function confirmStart(): Promise<boolean> {
  try {
    return await confirm({
      message: colors.primary("[*] Start Frink?"),
      default: true,
    });
  } catch (error: any) {
    if (error.name === "ExitPromptError") {
      return false;
    }
    throw error;
  }
}

// Quick task input (single line)
export async function promptQuickTask(): Promise<string | null> {
  try {
    return await input({
      message: colors.primary("[>] Task:"),
      validate: (value: string) => value.trim() ? true : "Enter a task",
    });
  } catch (error: any) {
    if (error.name === "ExitPromptError") {
      return null;
    }
    throw error;
  }
}

// Continue prompt
export async function promptContinue(): Promise<boolean> {
  try {
    return await confirm({
      message: colors.muted("[?] Continue with another task?"),
      default: false,
    });
  } catch (error: any) {
    if (error.name === "ExitPromptError") {
      return false;
    }
    throw error;
  }
}
