// CLI Argument Parser
// Handles command-line argument parsing for Frink Loop

import { showLogo } from "./ui.js";
import { colors } from "../ui/theme.js";

// =============================================================================
// Types
// =============================================================================

export interface ParsedArgs {
  task?: string;
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

  // Interactive mode if no task provided
  const interactive = argv.length === 0 || !argv.some(a => !a.startsWith("-"));

  let task: string | undefined;
  let workingDir: string | undefined;
  let prompt: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" || arg === "-d") {
      workingDir = argv[++i];
    } else if (arg === "--prompt" || arg === "-p") {
      prompt = argv[++i];
    } else if (arg === "--debug") {
      // Already handled
    } else if (!arg.startsWith("-")) {
      task = arg;
    }
  }

  return {
    task,
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
  ${colors.muted('frink "task" --dir ./project')}   ${colors.muted("# Specify directory")}

${colors.primary("Commands:")}
  ${colors.secondary("setup")}            Run configuration wizard

${colors.primary("Options:")}
  ${colors.secondary("-d, --dir")}        Working directory (default: current dir)
  ${colors.secondary("-p, --prompt")}     Custom prompt file (default: .frink/prompt.md)
  ${colors.secondary("--debug")}          Enable debug output
  ${colors.secondary("-h, --help")}       Show this help

${colors.primary("Examples:")}
  ${colors.muted('frink "Add user authentication"')}
  ${colors.muted('frink "Fix TypeScript errors" -d ./backend')}
  ${colors.muted('frink "Add dark mode"')}
  ${colors.muted("frink setup")}
`);
}
