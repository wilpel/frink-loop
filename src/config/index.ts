// Centralized Configuration Module
// Handles all configuration loading: environment variables, config files, and prompts

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Types
// =============================================================================

export interface CustomToolConfig {
  name: string;
  description: string;
  command: string;
  parameters?: {
    name: string;
    description: string;
    required?: boolean;
  }[];
}

export interface FrinkConfig {
  provider: "openai" | "anthropic";
  model: string;
  temperature: number;
  maxTokens: number;
  customTools?: CustomToolConfig[];
}

export interface EnvironmentConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  debug: boolean;
  maxIterations?: number;
  workingDirectory?: string;
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_CONFIG: FrinkConfig = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
};

const DEFAULT_PROMPT = `You are Frink, an AI orchestrator that controls Claude Code to complete coding tasks.

## How You Work
You manage a TODO list for YOURSELF. These are YOUR tasks to track your progress. You use the send_to_claude tool to have Claude Code actually perform the work (writing code, reading files, running commands). The tasks don't have to match exactly what you send to Claude - they're for organizing your approach.

## Approach: Discovery First, Then Plan
Make a plan to achieve what the user asks for. Remember you can refine your plan as you learn more, so a discovery task is often a good first step if you want to understand the project better before diving in.

1. **Discovery Phase**: If unfamiliar with the codebase, start by exploring - use send_to_claude to read key files, understand the structure, find relevant code
2. **Planning Phase**: Based on what you learn, create a concrete todo list with specific steps FOR YOURSELF
3. **Execution Phase**: Work through YOUR tasks by using send_to_claude to do the actual work

## Core Tools
- send_to_claude: Send prompts to Claude Code to DO WORK (reads/writes files, runs commands)
- todo_write: Replace YOUR task list (for planning and tracking YOUR progress)
- todo_read: Check YOUR current tasks
- todo_add: Add new tasks to YOUR list as you discover them
- todo_update: Update YOUR task status by ID (pending -> in_progress -> completed)
- todo_remove: Remove irrelevant tasks from YOUR list
- git_status: See changed files
- read_file: Verify file contents
- mark_task_complete: Signal when ALL YOUR tasks are done (will fail if tasks remain!)
- reset_claude_session: Clear Claude's context and start fresh (use when Claude is stuck)

## Task Management
YOUR task list tracks YOUR progress:
- Create tasks that represent logical chunks of work
- Mark tasks in_progress when you start working on them
- Use send_to_claude to perform the actual work
- Mark tasks completed when you've verified the work is done
- You CANNOT finish until ALL your tasks are completed

## When to Reset Claude Session
Use reset_claude_session when:
- Claude seems stuck in a loop
- Context is polluted with irrelevant information
- You want to retry with a clean slate

## Process
1. Assess - do you understand the codebase enough to plan?
2. If not, create a discovery task first and use send_to_claude to explore
3. Create concrete todos FOR YOURSELF based on what you learn
4. Work through each: mark in_progress -> use send_to_claude -> verify -> mark complete
5. Adapt your plan as you discover more
6. Call mark_task_complete ONLY when ALL tasks are done (user will confirm)

## Rules
- Tasks are FOR YOU to track progress, send_to_claude does the actual work
- You MUST complete ALL tasks before calling mark_task_complete
- Discovery first if unfamiliar with the project
- Be specific in prompts to Claude
- Verify changes before marking YOUR tasks complete
`;

// =============================================================================
// Path Resolution Helpers
// =============================================================================

function getConfigSearchPaths(workingDir?: string): string[] {
  const paths: string[] = [];

  // Project .frink directory (highest priority)
  if (workingDir) {
    paths.push(path.join(workingDir, ".frink"));
  }

  // Current working directory .frink
  paths.push(path.join(process.cwd(), ".frink"));

  // Module directory .frink (fallback)
  try {
    const moduleDir = path.dirname(new URL(import.meta.url).pathname);
    paths.push(path.join(moduleDir, "..", "..", ".frink"));
  } catch {
    // Ignore if import.meta.url is not available
  }

  return paths;
}

function getEnvSearchPaths(workingDir?: string): string[] {
  const paths: string[] = [];

  // Current directory .env
  paths.push(path.join(process.cwd(), ".env"));

  // Current directory .frink/.env
  paths.push(path.join(process.cwd(), ".frink", ".env"));

  // Project directory .env
  if (workingDir) {
    paths.push(path.join(workingDir, ".env"));
    paths.push(path.join(workingDir, ".frink", ".env"));
  }

  // Module directory .env (fallback)
  try {
    const moduleDir = path.dirname(new URL(import.meta.url).pathname);
    paths.push(path.join(moduleDir, "..", "..", ".env"));
    paths.push(path.join(moduleDir, "..", "..", ".frink", ".env"));
  } catch {
    // Ignore if import.meta.url is not available
  }

  return paths;
}

// =============================================================================
// Environment Loading
// =============================================================================

/**
 * Parse a .env file content and return key-value pairs
 */
function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Load environment variables from .env files
 * Does not override existing environment variables
 */
export async function loadEnvironment(workingDir?: string): Promise<boolean> {
  const envPaths = getEnvSearchPaths(workingDir);

  for (const envPath of envPaths) {
    try {
      const content = await fs.promises.readFile(envPath, "utf-8");
      const parsed = parseEnvContent(content);

      // Set environment variables (don't override existing)
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }

      return true;
    } catch {
      // Try next path
    }
  }

  return false;
}

/**
 * Get current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    debug: process.env.DEBUG === "1" || process.env.DEBUG === "true",
    maxIterations: process.env.MAX_ITERATIONS ? parseInt(process.env.MAX_ITERATIONS, 10) : undefined,
    workingDirectory: process.env.WORKING_DIRECTORY,
  };
}

/**
 * Check if any API key is available
 */
export function hasApiKey(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

// =============================================================================
// Config File Loading
// =============================================================================

/**
 * Load configuration from config.json files
 */
export function loadConfig(workingDir?: string): FrinkConfig {
  const searchPaths = getConfigSearchPaths(workingDir);

  for (const basePath of searchPaths) {
    const configPath = path.join(basePath, "config.json");
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(content) as Partial<FrinkConfig>;
        return { ...DEFAULT_CONFIG, ...config };
      }
    } catch {
      // Try next path
    }
  }

  return DEFAULT_CONFIG;
}

// =============================================================================
// Prompt Loading
// =============================================================================

/**
 * Load agent prompt from prompt.md files
 */
export function loadPrompt(customPath?: string, workingDir?: string): string {
  const pathsToTry: string[] = [];

  // Custom path first (highest priority)
  if (customPath) {
    pathsToTry.push(customPath);
  }

  // Search in standard locations
  const searchPaths = getConfigSearchPaths(workingDir);
  for (const basePath of searchPaths) {
    pathsToTry.push(path.join(basePath, "prompt.md"));
  }

  for (const promptPath of pathsToTry) {
    try {
      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, "utf-8");
      }
    } catch {
      // Try next path
    }
  }

  return DEFAULT_PROMPT;
}

// =============================================================================
// Config Saving (for setup wizard)
// =============================================================================

export interface SaveConfigOptions {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
  baseDir?: string;
}

/**
 * Save configuration to .frink directory
 */
export function saveConfig(options: SaveConfigOptions): string {
  const baseDir = options.baseDir || process.cwd();
  const frinkDir = path.join(baseDir, ".frink");

  // Create .frink directory if needed
  if (!fs.existsSync(frinkDir)) {
    fs.mkdirSync(frinkDir, { recursive: true });
  }

  // Save API key to .env
  const envPath = path.join(frinkDir, ".env");
  const envKey = options.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  const envContent = `# Frink Loop API Key\n${envKey}=${options.apiKey}\n`;
  fs.writeFileSync(envPath, envContent);

  // Save config.json
  const configPath = path.join(frinkDir, "config.json");
  const configContent: FrinkConfig = {
    provider: options.provider,
    model: options.model,
    temperature: DEFAULT_CONFIG.temperature,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };
  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

  return frinkDir;
}

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_CONFIG, DEFAULT_PROMPT };
