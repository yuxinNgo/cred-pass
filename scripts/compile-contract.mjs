import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const windows = process.platform === "win32";
const executable = process.env.COMPACTC || "compactc";
const run = (args) => execFileSync(windows ? "wsl" : executable,
  windows ? ["--exec", executable, ...args] : args, { encoding: "utf8" });
if (run(["--version"]).trim() !== "0.26.0") {
  throw new Error("Contract tests require Compact compiler 0.26.0");
}
const path = (value) => windows
  ? execFileSync("wsl", ["--exec", "wslpath", "-a", resolve(value)], { encoding: "utf8" }).trim()
  : resolve(value);
process.stdout.write(run(["--skip-zk", path("contracts/credential-registry.compact"), path("contracts/managed")]));
