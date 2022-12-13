const esbuild = require("esbuild");
const { nodeExternalsPlugin } = require("esbuild-node-externals");

esbuild.build({
  entryPoints: ['lib/index.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/index.js',
  plugins: [nodeExternalsPlugin()],
});
