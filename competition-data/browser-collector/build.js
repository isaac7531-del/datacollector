const { copyFileSync, mkdirSync, rmSync } = require("fs");
const { join } = require("path");

const out = join(__dirname, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ["manifest.json", "content.js", "status.html", "status.js"]) {
  copyFileSync(join(__dirname, file), join(out, file));
}
console.log(JSON.stringify({ built: true, out }));
