"use strict";
const path = require("path");
const semver = require("semver");
const colors = require("colors");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const log = require("@zelda-cli-dev/log");
const pkg = require("../package.json");
const constant = require("./const");

module.exports = core;

let args;
function core() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
  } catch (e) {
    log.error(e.message);
  }
}
// 检查版本号
function checkPkgVersion() {}

// 检查node版本号
function checkNodeVersion() {
  const currentVersion = process.version;
  const lowVersion = constant.LOWEST_NODE_VERSION;
  if (!semver.gte(currentVersion, lowVersion)) {
    throw new Error(
      colors.red(`zelda-cli-dev 需要安装 v${lowVersion} 以上版本的 Node.js`)
    );
  }
}

// 检查root账户
function checkRoot() {
  // root降级操作
  const rootCheck = require("root-check");
  rootCheck();
}

// 检查用户主目录
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error("用户主目录不存在");
  }
}

// 检查入参，全局注册log debug模式
function checkInputArgs() {
  const minimist = require("minimist");
  args = minimist(process.argv.slice(2));
  checkArgs();
}

function checkArgs() {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  log.level = process.env.LOG_LEVEL;
}

// 检查环境变量
function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  if (dotenvPath) {
    dotenv.config({
      path: path.resolve(userHome, ".env"),
    });
  }
  createDefaultConfig()
  console.log("环境变量", process.env.CLI_HOME);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  // 检查环境变量是否存在脚手架主目录
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME = cliConfig.cliHome;
}
