// Setup wizard for first-time configuration
// Prompts for API keys and model settings

import * as fs from "fs";
import * as path from "path";
import { select, input, password, confirm } from "@inquirer/prompts";
import { colors } from "../ui/theme.js";
import { hasApiKey, saveConfig } from "../config/index.js";
import { AVAILABLE_MODELS } from "../providers/index.js";

// =============================================================================
// Types
// =============================================================================

export interface SetupConfig {
  provider: "openai" | "anthropic" | "zai";
  model: string;
  apiKey: string;
}

// =============================================================================
// Setup Check
// =============================================================================

/**
 * Check if setup wizard is needed (no .frink folder or no API key)
 */
export function needsSetup(): boolean {
  const frinkDir = path.join(process.cwd(), ".frink");
  if (!fs.existsSync(frinkDir)) {
    return true;
  }
  return !hasApiKey();
}

// =============================================================================
// Setup Wizard
// =============================================================================

/**
 * Run the interactive setup wizard
 * @param force - Force setup even if already configured
 */
export async function runSetup(force: boolean = false): Promise<SetupConfig | null> {
  const message = force ? "[Setup] Reconfigure settings" : "[Setup] First-time configuration";
  console.log(colors.primary(`\n  ${message}\n`));

  try {
    // Step 1: Select provider
    const provider = await select({
      message: colors.primary("[1] Select AI provider:"),
      choices: [
        { name: "OpenAI (GPT-5, o3)", value: "openai" as const },
        { name: "Anthropic (Claude)", value: "anthropic" as const },
        { name: "Z.AI (GLM Coding Plan)", value: "zai" as const },
      ],
    });

    // Step 2: Select model based on provider
    const models = AVAILABLE_MODELS[provider];
    const modelChoices = models.map(m => ({ name: m.name, value: m.id }));
    const model = await select({
      message: colors.primary("[2] Select model:"),
      choices: modelChoices,
    });

    // Step 3: Get API key
    const keyLabelMap = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      zai: "Z.AI",
    };
    const keyLabel = keyLabelMap[provider];
    const apiKey = await password({
      message: colors.primary(`[3] Enter ${keyLabel} API key:`),
      mask: "*",
      validate: (input: string) => input.trim() ? true : "API key is required",
    });

    // Step 4: Save option
    const save = await confirm({
      message: colors.muted("Save to .frink/.env?"),
      default: true,
    });

    // Save configuration if requested
    if (save) {
      const savedDir = saveConfig({ provider, model, apiKey });
      console.log(colors.muted(`\n  Saved to ${savedDir}/`));
      console.log(colors.muted("  Add .frink/.env to .gitignore!\n"));
    }

    // Set env var for current session
    if (provider === "openai") {
      process.env.OPENAI_API_KEY = apiKey;
    } else if (provider === "anthropic") {
      process.env.ANTHROPIC_API_KEY = apiKey;
    } else {
      process.env.ZAI_API_KEY = apiKey;
    }

    return { provider, model, apiKey };
  } catch (error: any) {
    // Handle Ctrl+C gracefully
    if (error.name === "ExitPromptError") {
      console.log(colors.muted("\n  Setup cancelled.\n"));
      return null;
    }
    throw error;
  }
}
