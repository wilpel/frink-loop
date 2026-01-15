// Configuration Module
// Handles configuration loading: environment variables, config files, and prompts

import * as fs from "fs";
import * as path from "path";

// Re-export types and prompts
export * from "./types.js";
export { SYSTEM_PROMPT, buildTaskPrompt, buildTaskPromptWithPredefinedTasks } from "./prompts.js";

import type { FrinkConfig, EnvironmentConfig, SaveConfigOptions } from "./types.js";
import { SYSTEM_PROMPT } from "./prompts.js";

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_CONFIG: FrinkConfig = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
};

// =============================================================================
// Path Resolution
// =============================================================================

function getConfigSearchPaths(workingDir?: string): string[] {
  const paths: string[] = [];

  if (workingDir) {
    paths.push(path.join(workingDir, ".frink"));
  }

  paths.push(path.join(process.cwd(), ".frink"));

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

  paths.push(path.join(process.cwd(), ".env"));
  paths.push(path.join(process.cwd(), ".frink", ".env"));

  if (workingDir) {
    paths.push(path.join(workingDir, ".env"));
    paths.push(path.join(workingDir, ".frink", ".env"));
  }

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

export async function loadEnvironment(workingDir?: string): Promise<boolean> {
  const envPaths = getEnvSearchPaths(workingDir);

  for (const envPath of envPaths) {
    try {
      const content = await fs.promises.readFile(envPath, "utf-8");
      const parsed = parseEnvContent(content);

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

export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    zaiApiKey: process.env.ZAI_API_KEY,
    debug: process.env.DEBUG === "1" || process.env.DEBUG === "true",
    maxIterations: process.env.MAX_ITERATIONS ? parseInt(process.env.MAX_ITERATIONS, 10) : undefined,
    workingDirectory: process.env.WORKING_DIRECTORY,
  };
}

export function hasApiKey(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.ZAI_API_KEY);
}

// =============================================================================
// Config File Loading
// =============================================================================

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

export function loadPrompt(customPath?: string, workingDir?: string): string {
  const pathsToTry: string[] = [];

  if (customPath) {
    pathsToTry.push(customPath);
  }

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

  return SYSTEM_PROMPT;
}

// =============================================================================
// Config Saving
// =============================================================================

export function saveConfig(options: SaveConfigOptions): string {
  const baseDir = options.baseDir || process.cwd();
  const frinkDir = path.join(baseDir, ".frink");

  if (!fs.existsSync(frinkDir)) {
    fs.mkdirSync(frinkDir, { recursive: true });
  }

  // Save API key to .env
  const envPath = path.join(frinkDir, ".env");
  const envKeyMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    zai: "ZAI_API_KEY",
  };
  const envKey = envKeyMap[options.provider];
  fs.writeFileSync(envPath, `# Frink Loop API Key\n${envKey}=${options.apiKey}\n`);

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
// Legacy Exports (for backward compatibility)
// =============================================================================

export { DEFAULT_CONFIG };
export const DEFAULT_PROMPT = SYSTEM_PROMPT;
