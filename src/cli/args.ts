// CLI Argument Parser
// Handles command-line argument parsing for Frink Loop

import * as fs from "fs";
import { showLogo } from "./ui.js";
import { colors } from "../ui/theme.js";

// =============================================================================
// Types
// =============================================================================

export interface TaskDefinition {
  prompt: string;
  tasks: string[];
}

export interface ParsedArgs {
  task?: string;
  taskFile?: string;
  taskDefinition?: TaskDefinition;
  workingDir?: string;
  prompt?: string;
  interactive: boolean;
  debug: boolean;
  help: boolean;
  setup: boolean;
}

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse command line arguments
 */
export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  // Check for help flag
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      interactive: false,
      debug: false,
      help: true,
      setup: false,
    };
  }

  // Check for setup command
  if (argv[0] === "setup") {
    return {
      interactive: false,
      debug: false,
      help: false,
      setup: true,
    };
  }

  // Debug mode
  const debug = argv.includes("--debug");
  if (debug) {
    process.env.DEBUG = "1";
  }

  let task: string | undefined;
  let taskFile: string | undefined;
  let workingDir: string | undefined;
  let prompt: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" || arg === "-d") {
      workingDir = argv[++i];
    } else if (arg === "--prompt" || arg === "-p") {
      prompt = argv[++i];
    } else if (arg === "--file" || arg === "-f") {
      taskFile = argv[++i];
    } else if (arg === "--debug") {
      // Already handled
    } else if (!arg.startsWith("-")) {
      task = arg;
    }
  }

  // If task file provided, read task from file
  let taskDefinition: TaskDefinition | undefined;

  if (taskFile) {
    try {
      const content = fs.readFileSync(taskFile, "utf-8").trim();

      // Check if it's a JSON file with structured tasks
      if (taskFile.endsWith(".json")) {
        const parsed = JSON.parse(content);
        if (parsed.prompt && Array.isArray(parsed.tasks)) {
          taskDefinition = {
            prompt: parsed.prompt,
            tasks: parsed.tasks,
          };
          task = parsed.prompt;
        } else {
          // Plain JSON with just a task string
          task = content;
        }
      } else {
        // Plain text file
        task = content;
      }
    } catch (error) {
      console.error(`Error reading task file: ${taskFile}`);
      process.exit(1);
    }
  }

  // Interactive mode if no task provided
  const interactive = !task;

  return {
    task,
    taskFile,
    taskDefinition,
    workingDir,
    prompt,
    interactive,
    debug,
    help: false,
    setup: false,
  };
}

// =============================================================================
// Help Display
// =============================================================================

/**
 * Show help message and usage information
 */
export function showHelp(): void {
  showLogo();
  console.log(`
${colors.primary("Usage:")}
  ${colors.muted("frink")}                          ${colors.muted("# Interactive mode (uses current dir)")}
  ${colors.muted('frink "your task"')}              ${colors.muted("# Run with task")}
  ${colors.muted('frink -f ./task.md')}             ${colors.muted("# Run with task from file")}
  ${colors.muted('frink "task" --dir ./project')}   ${colors.muted("# Specify directory")}

${colors.primary("Commands:")}
  ${colors.secondary("setup")}            Run configuration wizard

${colors.primary("Options:")}
  ${colors.secondary("-f, --file")}       Read task from file (alternative to string)
  ${colors.secondary("-d, --dir")}        Working directory (default: current dir)
  ${colors.secondary("-p, --prompt")}     Custom system prompt file (default: .frink/prompt.md)
  ${colors.secondary("--debug")}          Enable debug output
  ${colors.secondary("-h, --help")}       Show this help

${colors.primary("Examples:")}
  ${colors.muted('frink "Add user authentication"')}
  ${colors.muted('frink -f ./TASK.md -d ./backend')}
  ${colors.muted('frink -f ./tasks.json')}              ${colors.muted("# Pre-defined tasks")}
  ${colors.muted("frink setup")}

${colors.primary("Task File Formats:")}
  ${colors.muted("Plain text (.md, .txt):")}
    Just the task description

  ${colors.muted("JSON with pre-defined tasks (.json):")}
    ${colors.muted('{ "prompt": "Build feature X", "tasks": ["Step 1", "Step 2"] }')}
`);
}
