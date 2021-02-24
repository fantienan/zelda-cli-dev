"use strict";
const semver = require("semver");
const colors = require("colors");
const log = require("@zelda-cli-dev/log");

const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) throw new Error("参数不能为空");
    if (!Array.isArray(argv)) throw new Error("参数必须为数组");
    if (!argv.length) throw new Error("参数列表不能为空");
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(this.checkNodeVersion.bind(this));
      chain.then(this.initArgs.bind(this));
      chain.then(this.init.bind(this));
      chain.then(this.exec.bind(this));
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  // 检查node版本号
  checkNodeVersion() {
    const currentVersion = process.version;
    const lowVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowVersion)) {
      throw new Error(
        colors.red(`zelda-cli-dev 需要安装 v${lowVersion} 以上版本的 Node.js`)
      );
    }
  }
  // 初始化参数
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }
  init() {
    throw new Error("init必须实现");
  }
  exec() {}
}

module.exports = Command;
