import { execSync } from "node:child_process";

const ports = [3000, 3001, 3002];

function killPortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port} "`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const pids = new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes("LISTENING"))
        .map((line) => Number(line.split(/\s+/).at(-1)))
        .filter((pid) => Number.isFinite(pid) && pid > 0),
    );

    for (const pid of pids) {
      console.log(`Stopping PID ${pid} on port ${port}`);
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } catch {
        try {
          execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`, {
            stdio: "ignore",
          });
        } catch {
          // proceso ya terminado
        }
      }
    }
  } catch {
    // puerto libre
  }
}

if (process.platform === "win32") {
  for (const port of ports) {
    killPortWindows(port);
  }
} else {
  for (const port of ports) {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "inherit",
        shell: true,
      });
    } catch {
      // puerto libre
    }
  }
}
