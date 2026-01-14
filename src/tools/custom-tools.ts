// Custom Tools Builder
// Creates tools from config-defined commands

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import { spawn } from "child_process";
import { c } from "../ui/theme.js";
import type { CustomToolConfig } from "../config/index.js";
import type { ToolDefinition } from "../providers/types.js";

/**
 * Execute a shell command and return the output
 */
async function executeCommand(
  command: string,
  args: Record<string, string>,
  workingDir: string
): Promise<{ output: string; exitCode: number; success: boolean }> {
  // Replace placeholders in command with actual arguments
  let finalCommand = command;
  for (const [key, value] of Object.entries(args)) {
    // Replace {{key}} or ${key} style placeholders
    finalCommand = finalCommand.replace(new RegExp(`\\{\\{${key}\\}\\}|\\$\\{${key}\\}`, "g"), value);
  }

  return new Promise((resolve) => {
    const proc = spawn("bash", ["-c", finalCommand], {
      cwd: workingDir,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code: number | null) => {
      const exitCode = code ?? 0;
      resolve({
        output: output + (errorOutput ? `\n[STDERR]: ${errorOutput}` : ""),
        exitCode,
        success: exitCode === 0,
      });
    });

    proc.on("error", (err: Error) => {
      resolve({
        output: `[ERROR]: ${err.message}`,
        exitCode: 1,
        success: false,
      });
    });
  });
}

/**
 * Build a Zod schema from parameter definitions
 */
function buildParameterSchema(params?: CustomToolConfig["parameters"]): z.ZodObject<any> {
  if (!params || params.length === 0) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of params) {
    let schema = z.string().describe(param.description);
    if (!param.required) {
      schema = schema.optional() as any;
    }
    shape[param.name] = schema;
  }

  return z.object(shape);
}

/**
 * Create tools from custom tool configurations
 */
export function buildCustomTools(
  customToolConfigs: CustomToolConfig[],
  workingDir: string
): ToolDefinition[] {
  return customToolConfigs.map((config) => {
    const parameterSchema = buildParameterSchema(config.parameters);

    return defineTool({
      name: config.name,
      description: config.description,
      parameters: parameterSchema,
      execute: async (args: Record<string, unknown>) => {
        // Convert unknown values to strings
        const stringArgs: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
          stringArgs[key] = String(value);
        }

        console.log();
        console.log(c.primary(`  [Custom Tool: ${config.name}]`));
        console.log(c.muted(`  Command: ${config.command}`));
        if (Object.keys(stringArgs).length > 0) {
          console.log(c.muted(`  Args: ${JSON.stringify(stringArgs)}`));
        }

        const result = await executeCommand(config.command, stringArgs, workingDir);

        if (result.success) {
          console.log(c.muted(`  [Completed successfully]`));
        } else {
          console.log(c.muted(`  [Failed with exit code ${result.exitCode}]`));
        }
        console.log();

        return {
          success: result.success,
          output: result.output,
          exitCode: result.exitCode,
        };
      },
    });
  });
}
