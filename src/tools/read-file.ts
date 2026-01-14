// Read File Tool
// Read file contents for verification

import { z } from "zod";
import { defineTool } from "./tool-helper.js";
import * as fs from "fs/promises";

export const readFileTool = defineTool({
  name: "read_file",
  description: "Read a file's contents to verify changes or understand context (first 100 lines)",
  parameters: z.object({
    path: z.string().describe("Path to the file to read"),
  }),
  execute: async ({ path }) => {
    try {
      const content = await fs.readFile(path, "utf-8");
      const lines = content.split("\n");
      const maxLines = 100;
      const truncated = lines.length > maxLines;
      const result = lines.slice(0, maxLines).join("\n");

      return {
        success: true,
        content: result,
        totalLines: lines.length,
        truncated,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  },
});
