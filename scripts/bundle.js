const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["lib/index.js"],
  bundle: true,
  platform: "node",
  outfile: "dist/index.js",
  packages: "external",
});
