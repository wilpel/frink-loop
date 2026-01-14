#!/usr/bin/env node
// Frink Loop - Smart autonomous coding loop
// Supports both OpenAI and Anthropic as orchestrating agents

if (!process.env.DEBUG) {
  process.env.DEBUG = "";
}

import * as path from "path";

// Config & Environment
import { loadEnvironment, hasApiKey } from "./config/index.js";

// Agent
import { FrinkAgent } from "./agent.js";

// Tools & Session
import { getOrCreateSession, resetSession } from "./tools/claude-session.js";
import { setSessionConfig } from "./tools/reset-session.js";
import { resetTodoState } from "./state/todo-state.js";
import { resetTodoRenderer } from "./ui/todo-renderer.js";

// CLI
import { parseArgs, showHelp } from "./cli/args.js";
import { showLogo, showDisclaimer, showTaskStatus, showResult, showDivider } from "./cli/ui.js";
import { promptForTask, confirmStart } from "./cli/prompts.js";
import { needsSetup, runSetup } from "./cli/setup.js";

// Theme
import { colors, c } from "./ui/theme.js";

// =============================================================================
// Task Prompt Builder
// =============================================================================

function buildTaskPrompt(task: string, workingDir: string): string {
  return `
## Task
${task}

## Working Directory
${workingDir}

## Instructions
1. First, if you're unfamiliar with this project, create a discovery task to understand the codebase
2. Create YOUR todo list to track the steps YOU need to take
3. Work through YOUR tasks by using send_to_claude to have Claude Code do the actual work
4. Verify results using git_status and read_file
5. Add new tasks to YOUR list if you discover more work needed
6. Reset Claude session if Claude gets stuck
7. Call mark_task_complete ONLY when ALL YOUR tasks are completed

Remember: Tasks are for YOU to track progress. Use send_to_claude to do the actual coding work.
Start by creating your plan, then begin working through it.
`;
}

// =============================================================================
// Reset All State
// =============================================================================

function resetAllState(): void {
  resetSession();
  resetTodoState();
  resetTodoRenderer();
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  // Load environment variables
  await loadEnvironment();

  // Parse CLI arguments
  const args = parseArgs();

  // Handle help flag
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Handle setup command
  if (args.setup) {
    console.clear();
    showLogo();
    const setupResult = await runSetup(true);
    if (setupResult) {
      console.log(colors.primary("\n    Setup complete!\n"));
    } else {
      console.log(colors.muted("\n    Setup cancelled.\n"));
    }
    process.exit(0);
  }

  // Show logo
  console.clear();
  showLogo();

  // Check if setup is needed
  if (needsSetup()) {
    const setupResult = await runSetup();
    if (!setupResult) {
      console.log(colors.muted("\n    Setup cancelled.\n"));
      process.exit(0);
    }
  }

  // Verify API key exists
  if (!hasApiKey()) {
    console.log(colors.muted("    [!!] No API key found"));
    console.log(colors.muted("    Run 'frink setup' to configure.\n"));
    process.exit(1);
  }

  // Show disclaimer
  showDisclaimer();

  // Get task input
  let task: string;
  let workingDir: string;

  if (args.interactive || !args.task) {
    // Interactive mode
    const input = await promptForTask(args.workingDir || process.cwd());
    if (!input) {
      console.log(colors.muted("\n    Cancelled.\n"));
      process.exit(0);
    }
    task = input.task;
    workingDir = path.resolve(input.workingDir);

    showTaskStatus(task, workingDir);

    if (!(await confirmStart())) {
      console.log(colors.muted("\n    Cancelled.\n"));
      process.exit(0);
    }
  } else {
    // CLI mode
    task = args.task;
    workingDir = path.resolve(args.workingDir || process.cwd());
    showTaskStatus(task, workingDir);
  }

  showDivider();

  // Initialize Claude session (always YOLO mode)
  console.log(c.muted("\n    [*] Initializing..."));
  const sessionConfig = {
    workingDirectory: workingDir,
    yoloMode: true,
  };
  setSessionConfig(sessionConfig);
  const claudeSession = getOrCreateSession(sessionConfig);

  // Create the agent
  let agent: FrinkAgent;
  try {
    agent = new FrinkAgent({
      promptPath: args.prompt,
      workingDir,
    });
    console.log(c.muted(`    [*] Provider: ${agent.getProviderName()}`));
    console.log(c.muted(`    [*] Model: ${agent.getModelName()}`));
  } catch (error) {
    console.log(c.muted(`\n    [!!] Error: ${(error as Error).message}\n`));
    process.exit(1);
  }

  // Build the task prompt
  const fullPrompt = buildTaskPrompt(task, workingDir);

  console.log(c.primary("\n    [*] Starting Frink Loop"));
  console.log(c.muted("        (ctrl+c to interrupt)\n"));
  showDivider();

  try {
    // Run the agent with streaming
    let finalOutput = "";

    for await (const event of agent.run(fullPrompt, {
      onTextDelta: (text) => {
        process.stdout.write(c.muted(text));
      },
      onToolCall: (name) => {
        console.log(c.primary(`\n    [Frink] ${name}`));
      },
      onError: (error) => {
        console.log(c.muted(`\n    [!!] Error: ${error.message}`));
      },
    })) {
      // Events are handled by callbacks
      if (event.type === "text_delta") {
        finalOutput += event.data.text;
      }
    }

    // Show result
    const success = finalOutput.toLowerCase().includes("complete") ||
                    finalOutput.toLowerCase().includes("success");

    showResult(success, finalOutput.substring(0, 200), claudeSession.getCallCount());

  } catch (error) {
    console.log(c.muted("\n    [!!] Error occurred:"));
    const errorMessage = (error as Error).message || "Unknown error";

    if (errorMessage.includes("rate limit")) {
      console.log(colors.muted("    [!!] Rate limited - wait and try again"));
    } else {
      console.log(colors.muted(`    [!!] ${errorMessage}`));
    }
  } finally {
    resetAllState();
  }

  console.log(colors.muted("\n    [*] Frink Loop complete\n"));
}

// Run
main().catch(console.error);
