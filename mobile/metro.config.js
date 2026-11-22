const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
// The portable SSE reader is shared with the web app, outside the mobile root.
config.watchFolders = [...new Set([
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "../src/lib"),
])];

module.exports = withNativeWind(config, { input: "./global.css" });
