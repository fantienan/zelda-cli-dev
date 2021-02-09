"use strict";
const path = require("path");
const semver = require("semver");
const colors = require("colors");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const commander = require("commander");
const log = require("@zelda-cli-dev/log");
const pkg = require("../package.json");
const constant = require("./const");
// const init = require("@zelda-cli-dev/init");
const exec = require("@zelda-cli-dev/exec");

module.exports = core;

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}
// 脚手架准备阶段（脚手架启动阶段）
async function prepare() {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

// 检查版本号
function checkPkgVersion() {
	console.log(colors.green(pkg.version))
}

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
  if (process.env.CLI_HOME_PATH) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME_PATH);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
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

// commander脚手架初始化（命令注册）
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    // 注册全局配置
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否制定本地调试文件路径", "");

  // 注册子命令
  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);

  // command全局配置
  const globalOptions = program.opts();
  // 开启debug模式
  program.on("option:debug", function () {
    if (globalOptions.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });
  // 未命中的命令监听
  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red("未知命令：" + obj[0]));
    if (availableCommands.length > 0) {
      console.log(colors.red("可用命令：" + availableCommands.join(",")));
    }
  });

  program.on("option:targetPath", function () {
    process.env.CLI_TARGET_PATH = globalOptions.targetPath;
  });

  program.parse(process.argv);
  // 对未输入命令的处理
  if (program.args && !program.args.length) {
    program.outputHelp();
  }
}
