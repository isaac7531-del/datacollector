#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const exportRoot = join(root, "export");
const packageName = "equibets-nutrition-data-replit";
const target = join(exportRoot, packageName);
const zipPath = join(exportRoot, `${packageName}.zip`);

await mkdir(exportRoot, { recursive: true });
await rm(target, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(target, { recursive: true });

const entries = [
  ".dockerignore",
  ".env.example",
  "Dockerfile",
  "README.md",
  "REPLIT_INTEGRATION_PROMPT.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vitest.config.ts",
  "src",
  "docs",
  "examples",
  "migrations",
  "scripts",
  "tests"
];

for (const entry of entries) {
  const from = join(root, entry);
  if (existsSync(from)) await cp(from, join(target, entry), { recursive: true });
}

execFileSync("zip", ["-qr", zipPath, packageName], { cwd: exportRoot, stdio: "inherit" });
console.log(zipPath);
