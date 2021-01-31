"use strict";
const path = require("path");
const semver = require("semver");
const colors = require("colors");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const log = require("@zelda-cli-dev/log");
const commander = require("commander");
const pkg = require("../package.json");
const constant = require("./const");

module.exports = core;

let args;
const program = new commander.Command();
async function core() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    // checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}
/**
 * 命令注册
 */
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
  createDefaultConfig();
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
// 检查版本号是否为最新
// 1. 获取当前版本号和模块
// 2. 调用npm API，获取所有版本号
// 3. 提取所有版本号，对比哪些版本号是大于当前版本号
// 4. 获取最新的版本号，提示用户更新到该版本
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const { getNpmSemverVersion } = require("@zelda-cli-dev/get-npm-info");
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${lastVersion}
    更新命令：npm i -g ${npmName}`)
    );
  }
}

/**
 * 命令注册
 */

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false);
  // 开启debug模式
  program.on("option:debug", function () {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });
  // 为命中的命令监听
  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red("未知命令：" + obj[0]));
    if (availableCommands.length > 0) {
      console.log(colors.red("可用命令：" + availableCommands.join(",")));
    }
  });
  program.parse(process.argv);
  // 对未输入命令的处理
  if (program.args && !program.args.length) {
    program.outputHelp();
  }
}
