import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

import { buildDockerRunArgs, type ContainerLaunchConfig } from "./container.js";

const encoded = process.env.FOUNDRY_CONTAINER_LAUNCH_CONFIG;
if (!encoded) throw new Error("FOUNDRY_CONTAINER_LAUNCH_CONFIG is required");
const config = JSON.parse(encoded) as ContainerLaunchConfig;
const args = buildDockerRunArgs(config, process.argv.slice(2));
const child = spawn(config.docker_bin, args, { stdio: ["pipe", "pipe", "pipe"] });

process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

let stopping = false;
function stop(): void {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  spawnSync(config.docker_bin, ["container", "rm", "--force", config.container_name], {
    stdio: "ignore",
    timeout: 2_000,
  });
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
child.once("error", (error) => {
  process.stderr.write(`Unable to start Docker worker: ${error.message}\n`);
  process.stdin.unpipe(child.stdin);
  process.stdin.pause();
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.stdin.unpipe(child.stdin);
  process.stdin.pause();
  process.exitCode = code ?? (signal ? 1 : 0);
});
