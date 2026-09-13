import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = [
  "compile",
  "+0.31.1",
  ...(process.argv.includes("--fast") ? ["--skip-zk"] : []),
  "contracts/credential-registry.compact",
  "contracts/managed",
];
rmSync(`${root}contracts/managed`, { recursive: true, force: true });

const result = process.platform === "win32"
  ? spawnSync("wsl", [
      "-d", "Ubuntu", "--", "bash", "-lc",
      `cd '${execFileSync("wsl", ["-d", "Ubuntu", "--", "wslpath", "-a", root.replaceAll("\\", "/")], { encoding: "utf8" }).trim()}' && compact ${args.join(" ")}`,
    ], { stdio: "inherit" })
  : spawnSync("compact", args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const info = JSON.parse(readFileSync(`${root}contracts/managed/compiler/contract-info.json`, "utf8"));
assert.equal(info["compiler-version"], "0.31.1");
assert.equal(info["language-version"], "0.23.0");
assert.equal(info["runtime-version"], "0.16.0");
