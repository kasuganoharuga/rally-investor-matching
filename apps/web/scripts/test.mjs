import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function testFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? testFiles(path)
      : path.endsWith(".test.ts")
        ? [path]
        : [];
  });
}

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--conditions=react-server",
    "--test",
    ...testFiles("src").sort(),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
