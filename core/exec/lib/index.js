"use strict";
const Package = require("@zelda-cli-dev/package");
const path = require("path");
const log = require("@zelda-cli-dev/log");
const utils = require("@zelda-cli-dev/utils")

const SETTINGS = {
  // init: "@zelda-cli-dev/init",
  init: "@imooc-cli/init",
};

const CACHE_DIR = "dependencies";

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  let storeDir = "";
  let pkg = "";
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose("targetPaht", targetPath);
  log.verbose("homePath", homePath);
  // 获取本地代码入口文件
  // 1. targetPath -> modulePaht
  // 2. modilePaht -> Package(npm模块)
  // 3. Package.getRootFile(获取入口文件)
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest"; // 默认最新版本
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // TODO生成缓存路径
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose(homePath);
    log.verbose(targetPath);
    log.verbose(storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      // 在当前进程中执行
      // require(rootFile).call(null, Array.from(arguments));
      // 在node子进程中执行
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = {
        ...cmd.opts(),
      };
      Object.keys(cmd).forEach((key) => {
        if (
          key === "opts" ||
          (cmd.hasOwnProperty(key) && !key.startsWith("_") && key !== "parent")
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // cmd: node -e code
      const child = utils.exec("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (e) => {
        log.error(e.message);
        process.exit(1);
      });
      child.on("exit", (e) => {
        log.verbose("命令执行成功：" + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
