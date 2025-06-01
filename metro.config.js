const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

// Helper function to recursively find all files in a directory
function getAllFilesInDir(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFilesInDir(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Get all files in the ws package to completely block it
const wsPackagePath = path.resolve(__dirname, "node_modules/ws");
let wsFiles = [];
if (fs.existsSync(wsPackagePath)) {
  wsFiles = getAllFilesInDir(wsPackagePath).map(
    (file) => new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
}

// Create a more extensive block list for problematic Node.js modules
config.resolver.blockList = [
  // Block every single file in the ws package
  ...wsFiles,
  // Fallback in case the above doesn't work
  new RegExp(path.resolve(__dirname, "node_modules/ws/.*")),
  // Block ALL realtime files from Supabase
  new RegExp(path.resolve(__dirname, "node_modules/@supabase/.*/realtime.*")),
  new RegExp(path.resolve(__dirname, "node_modules/@supabase/.*/websocket.*")),
  // Block specific Node.js modules
  new RegExp(path.resolve(__dirname, "node_modules/http/.*")),
  new RegExp(path.resolve(__dirname, "node_modules/https/.*")),
  new RegExp(path.resolve(__dirname, "node_modules/net/.*")),
  new RegExp(path.resolve(__dirname, "node_modules/tls/.*")),
  new RegExp(path.resolve(__dirname, "node_modules/crypto/.*")),
  // Block all files in supabase that try to use Node.js modules
  new RegExp(
    path.resolve(__dirname, "node_modules/@supabase/.*/lib/.*Server.*")
  ),
  new RegExp(
    path.resolve(__dirname, "node_modules/@supabase/.*/lib/.*sender.*")
  ),
  new RegExp(
    path.resolve(__dirname, "node_modules/@supabase/.*/lib/.*receiver.*")
  ),
];

// Provide mocks for Node.js modules
config.resolver.extraNodeModules = {
  stream: require.resolve("readable-stream"),
  process: require.resolve("process/browser"),
  events: require.resolve("events"),
  // Create empty mock objects for all Node.js modules
  http: path.resolve(__dirname, "node_modules/stream-http"),
  https: path.resolve(__dirname, "node_modules/https-browserify"),
  net: path.resolve(__dirname, "lib/mocks/empty-module.js"),
  tls: path.resolve(__dirname, "lib/mocks/empty-module.js"),
  fs: path.resolve(__dirname, "lib/mocks/empty-module.js"),
  child_process: path.resolve(__dirname, "lib/mocks/empty-module.js"),
  zlib: path.resolve(__dirname, "node_modules/browserify-zlib"),
  crypto: path.resolve(__dirname, "node_modules/crypto-browserify"),
  // Explicitly mock out ws
  ws: path.resolve(__dirname, "lib/mocks/empty-module.js"),
};

module.exports = config;
