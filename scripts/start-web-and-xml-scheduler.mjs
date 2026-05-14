/**
 * Runs the Next.js server and the XML URL sync scheduler in one OS process group.
 * Used by Railway (Linux) and optional local production; `npm run dev` still uses `next dev` only.
 */
import { spawn } from "node:child_process";
import process from "node:process";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const sched = spawn(npmCmd, ["run", "xml-sync-scheduler"], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWin,
  env: process.env,
});

const web = spawn(npmCmd, ["run", "start"], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWin,
  env: process.env,
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  sched.kill(isWin ? undefined : "SIGTERM");
  web.kill(isWin ? undefined : "SIGTERM");
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

sched.on("exit", (code, signal) => {
  if (shuttingDown) return;
  console.error(`xml-sync-scheduler exited (code=${code}, signal=${signal}). Stopping web server.`);
  web.kill(isWin ? undefined : "SIGTERM");
  process.exit(typeof code === "number" && code !== 0 ? code : 1);
});

web.on("exit", (code) => {
  if (!shuttingDown) sched.kill(isWin ? undefined : "SIGTERM");
  process.exit(code ?? 0);
});
