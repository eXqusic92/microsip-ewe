#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const platform = process.platform;
const args = process.argv.slice(2);

function usage() {
  console.error([
    "Usage:",
    "  node tools/viber-read.js <target-phone-digits>",
    "  node tools/viber-read.js --check",
    "  node tools/viber-read.js --print-env",
    "",
    "Environment overrides:",
    "  DUMA_CLIENT_INFO_ROOT=/path/to/client-info",
    "  VIBER_DB_PATH=/path/to/ViberPC/<account-phone>/viber.db",
    "  VIBER_DB_KEY=<hex SEE key>",
    "  VIBER_PLUGIN_PATH=/path/that/contains/sqldrivers",
    "  VIBER_READER_BIN=/path/to/viber-reader(.exe)",
    "  VIBER_ACCOUNT_PHONE=<account-phone>",
    "  VIBER_MESSAGE_LIMIT=50",
    "",
    "This script is cross-platform, but viber-reader itself is native.",
    "Build/use viber-reader for the OS where it runs: macOS, Linux, or Windows."
  ].join("\n"));
}

function hasArg(name) {
  return args.includes(name);
}

function firstNonFlag() {
  return args.find((arg) => !arg.startsWith("--")) || "";
}

function exists(filePath) {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function isDir(filePath) {
  try {
    return Boolean(filePath) && fs.statSync(filePath).isDirectory();
  } catch (_) {
    return false;
  }
}

function listDirSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_) {
    return [];
  }
}

function findFile(root, predicate, maxDepth) {
  if (!isDir(root) || maxDepth < 0) {
    return "";
  }
  const entries = listDirSafe(root);
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isFile() && predicate(fullPath, entry.name)) {
      return fullPath;
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    const found = findFile(fullPath, predicate, maxDepth - 1);
    if (found) {
      return found;
    }
  }
  return "";
}

function firstExisting(paths) {
  return paths.find((item) => exists(item)) || "";
}

function rootDir() {
  if (process.env.DUMA_CLIENT_INFO_ROOT) {
    return process.env.DUMA_CLIENT_INFO_ROOT;
  }

  const scriptDir = __dirname;
  const repoRoot = path.resolve(scriptDir, "..");
  if (exists(path.join(repoRoot, "tools", "viber-reader.cpp"))) {
    return repoRoot;
  }
  if (exists(path.join(scriptDir, "viber-reader.cpp"))) {
    return scriptDir;
  }
  if (exists("/Users/exqusic/client-info/tools/viber-reader.cpp")) {
    return "/Users/exqusic/client-info";
  }
  return repoRoot;
}

function readerBin(root) {
  if (process.env.VIBER_READER_BIN) {
    return process.env.VIBER_READER_BIN;
  }
  const binaryName = platform === "win32" ? "viber-reader.exe" : "viber-reader";
  return firstExisting([
    path.join(root, "bin", binaryName),
    path.join(__dirname, "bin", binaryName),
    path.join("/Users/exqusic/client-info/bin", binaryName)
  ]) || path.join(root, "bin", binaryName);
}

function viberPcRoots() {
  const home = os.homedir();
  if (platform === "darwin") {
    return [path.join(home, "Library", "Application Support", "ViberPC")];
  }
  if (platform === "win32") {
    return [
      process.env.APPDATA ? path.join(process.env.APPDATA, "ViberPC") : "",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "ViberPC") : ""
    ].filter(Boolean);
  }
  return [
    path.join(home, ".ViberPC"),
    path.join(home, ".config", "ViberPC"),
    path.join(home, ".local", "share", "ViberPC")
  ];
}

function accountFromDb(dbPath) {
  const parent = path.basename(path.dirname(dbPath || ""));
  return /^[0-9]{8,15}$/.test(parent) ? parent : "";
}

function dbPath() {
  if (process.env.VIBER_DB_PATH) {
    return process.env.VIBER_DB_PATH;
  }
  const account = process.env.VIBER_ACCOUNT_PHONE || "";
  for (const root of viberPcRoots()) {
    if (account) {
      const candidate = path.join(root, account, "viber.db");
      if (exists(candidate)) {
        return candidate;
      }
    }
    const found = findFile(root, (_fullPath, name) => name === "viber.db", 2);
    if (found) {
      return found;
    }
  }
  return "";
}

function pluginRootFromDriver(driverPath) {
  const parent = path.basename(path.dirname(driverPath)).toLowerCase();
  if (parent === "sqldrivers") {
    return path.dirname(path.dirname(driverPath));
  }
  return path.dirname(driverPath);
}

function pluginSearchRoots() {
  const home = os.homedir();
  if (platform === "darwin") {
    return ["/Applications/Viber.app/Contents/PlugIns"];
  }
  if (platform === "win32") {
    return [
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Viber") : "",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "Viber") : "",
      process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Viber") : "",
      process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Viber") : "",
      path.join(home, "AppData", "Local", "Viber")
    ].filter(Boolean);
  }
  return [
    "/opt/viber",
    "/usr/lib/viber",
    "/usr/share/viber",
    path.join(home, ".local", "share", "viber")
  ];
}

function pluginPath() {
  if (process.env.VIBER_PLUGIN_PATH) {
    return process.env.VIBER_PLUGIN_PATH;
  }
  if (platform === "darwin") {
    const candidate = "/Applications/Viber.app/Contents/PlugIns";
    return isDir(candidate) ? candidate : "";
  }

  const driverName = platform === "win32" ? "qsqlite.dll" : "libqsqlite.so";
  for (const root of pluginSearchRoots()) {
    const found = findFile(root, (_fullPath, name) => name.toLowerCase() === driverName, 7);
    if (found) {
      return pluginRootFromDriver(found);
    }
  }
  return "";
}

function hexKey() {
  if (process.env.VIBER_DB_KEY) {
    return { value: process.env.VIBER_DB_KEY, derived: false };
  }
  const user = process.env.VIBER_KEY_USER || os.userInfo().username || path.basename(os.homedir());
  const reversed = Array.from(user).reverse().join("");
  return {
    value: Buffer.from(`aes128:${reversed}`, "utf8").toString("hex"),
    derived: true
  };
}

function childEnv(config) {
  const env = { ...process.env };
  if (platform === "win32") {
    const extra = [
      process.env.VIBER_LIBRARY_PATH,
      path.dirname(config.pluginPath),
      config.pluginPath
    ].filter(Boolean);
    env.PATH = `${extra.join(path.delimiter)}${path.delimiter}${env.PATH || ""}`;
  }
  if (platform === "linux") {
    const extra = [
      process.env.VIBER_LIBRARY_PATH,
      path.dirname(config.pluginPath),
      config.pluginPath
    ].filter(Boolean);
    env.LD_LIBRARY_PATH = `${extra.join(path.delimiter)}${path.delimiter}${env.LD_LIBRARY_PATH || ""}`;
    env.QT_PLUGIN_PATH = config.pluginPath;
  }
  return env;
}

function printEnv(config) {
  console.log(`VIBER_ENABLED=true`);
  console.log(`VIBER_DB_PATH=${config.dbPath}`);
  console.log(`VIBER_READER_BIN=${config.readerBin}`);
  console.log(`VIBER_PLUGIN_PATH=${config.pluginPath}`);
  console.log(`VIBER_ACCOUNT_PHONE=${config.accountPhone}`);
  console.log(`VIBER_DB_KEY=${config.key}`);
  console.log(`VIBER_MESSAGE_LIMIT=${config.limit}`);
}

function fail(message) {
  console.error(`[viber-read] ${message}`);
  process.exit(2);
}

if (hasArg("--help") || hasArg("-h")) {
  usage();
  process.exit(0);
}

const target = hasArg("--check") ? "__tables__" : firstNonFlag();
const printEnvOnly = hasArg("--print-env");

if (!target && !printEnvOnly) {
  usage();
  process.exit(2);
}

const root = rootDir();
const resolvedDbPath = dbPath();
const resolvedPluginPath = pluginPath();
const resolvedReaderBin = readerBin(root);
const key = hexKey();
const config = {
  dbPath: resolvedDbPath,
  pluginPath: resolvedPluginPath,
  readerBin: resolvedReaderBin,
  accountPhone: process.env.VIBER_ACCOUNT_PHONE || accountFromDb(resolvedDbPath),
  key: key.value,
  limit: process.env.VIBER_MESSAGE_LIMIT || "50"
};

if (printEnvOnly) {
  printEnv(config);
  process.exit(0);
}

if (!config.dbPath || !exists(config.dbPath)) {
  fail("Viber DB not found. Set VIBER_DB_PATH.");
}
if (!config.pluginPath || !isDir(config.pluginPath)) {
  fail("Viber Qt plugin path not found. Set VIBER_PLUGIN_PATH.");
}
if (!config.readerBin || !exists(config.readerBin)) {
  fail([
    `Native reader not found: ${config.readerBin}`,
    "The wrapper is cross-platform, but viber-reader must be built for this OS.",
    "macOS/Linux: build bin/viber-reader.",
    "Windows: build bin\\viber-reader.exe."
  ].join("\n[viber-read] "));
}
if (key.derived && platform !== "darwin") {
  console.error("[viber-read] VIBER_DB_KEY was auto-derived with the macOS formula.");
  console.error("[viber-read] This is verified on macOS only. If it fails, set VIBER_DB_KEY explicitly.");
}

const result = spawnSync(
  config.readerBin,
  [config.dbPath, config.key, config.pluginPath, target, String(config.limit)],
  {
    stdio: "inherit",
    env: childEnv(config),
    windowsHide: true
  }
);

if (result.error) {
  fail(result.error.message);
}

process.exit(result.status === null ? 1 : result.status);
