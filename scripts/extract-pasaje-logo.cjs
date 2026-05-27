const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const downloads = "c:/Users/brise/Downloads";
const zipName = fs.readdirSync(downloads).find((name) => /pasaje.*png\.zip/i.test(name));
if (!zipName) {
  console.error("Logo zip not found");
  process.exit(1);
}

const zipPath = path.join(downloads, zipName);
const tmpDir = path.join(__dirname, "..", "public", "logos", "_pasaje-tmp");
const outPath = path.join(__dirname, "..", "public", "logos", "pasaje-alamos.png");

fs.mkdirSync(tmpDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const png = fs
  .readdirSync(tmpDir, { recursive: true })
  .map((entry) => (typeof entry === "string" ? path.join(tmpDir, entry) : entry))
  .flat()
  .find((entry) => typeof entry === "string" && entry.toLowerCase().endsWith(".png") && fs.statSync(entry).size > 1000);

if (!png) {
  const all = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else all.push(full);
    }
  };
  walk(tmpDir);
  console.error("No PNG found. Files:", all);
  process.exit(1);
}

fs.copyFileSync(png, outPath);
console.log("Wrote", outPath, "from", png);
