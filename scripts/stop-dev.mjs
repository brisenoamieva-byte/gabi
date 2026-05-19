import { execSync } from "node:child_process";

const ports = [3000, 3001];

if (process.platform === "win32") {
  const script = `
    foreach ($port in ${ports.join(",")}) {
      Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
          if ($_ -and $_ -ne 0) {
            Write-Host "Stopping PID $_ on port $port"
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
          }
        }
    }
  `;
  execSync(`powershell -NoProfile -Command "${script.replace(/\n/g, " ")}"`, {
    stdio: "inherit",
  });
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
