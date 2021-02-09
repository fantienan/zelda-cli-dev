"use strict";
const Package = require("@zelda-cli-dev/package");
const log = require("@zelda-cli-dev/log");

const SETTINGS = {
  init: "@zelda-cli-dev/init",
};

function exec() {
  const targetPath = process.env.CLI_TARGET_PATH;
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
    targetPath = ""; // TODO生成缓存路径
  }
  const pkg = new Package({
    targetPath,
    packageName,
    packageVersion,
  });
}

module.exports = exec;
