// Git Status Tool
// Check repository state for verifying changes

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import { spawn } from "child_process";

export const gitStatusTool = defineTool({
  name: "git_status",
  description: "Check git status to see what files have been modified. Useful for verifying changes.",
  parameters: z.object({}),
  execute: async () => {
    const cwd = process.cwd();

    return new Promise((resolve) => {
      const git = spawn("git", ["status", "--porcelain"], { cwd });

      let output = "";
      git.stdout.on("data", (data: Buffer) => {
        output += data.toString();
      });

      git.on("close", () => {
        const files = output
          .split("\n")
          .filter(line => line.trim())
          .map(line => ({
            status: line.substring(0, 2).trim(),
            file: line.substring(3),
          }));

        resolve({
          hasChanges: files.length > 0,
          changedFiles: files.length,
          files,
        });
      });

      git.on("error", () => {
        resolve({ hasChanges: false, changedFiles: 0, files: [], error: "Not a git repo" });
      });
    });
  },
});
