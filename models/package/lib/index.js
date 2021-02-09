"use strict";
const path = require("path");
const pkgDir = require("pkg-dir").sync;
const { isObject } = require("@zelda-cli-dev/utils");
const formatPath = require("@zelda-cli-dev/format-path");
/**
 * 加载包的基类
 */
class Package {
  /**
   * @param {Object} options
   * @param {String} options.targetPath - package的目标路径
   * @param {String} options.packageName - package的name
   * @param {String} options.packageVersion - package的version
   */
  constructor(options) {
    if (!isObject(options)) {
      throw new Error("Package类的options必须为对象");
    }
    this.targetPath = options.targetPath;
    this.packageName = options.name;
    this.packageVersion = options.version;
    console.log(this.getRootFilePath());
  }
  // 判断当前Package是否存在
  exists() {}
  // 安装Package
  install() {}
  // 更新Package
  update() {}
  // 获取入口文件的路径
  getRootFilePath() {
    // 1. 获取package.json所在ml
    const dir = pkgDir(this.targetPath);
    if (dir) {
      // 2. 读取package.json
      const pkgFile = require(path.resolve(dir, "package.json"));
      // 3. 寻找main/lib
      if (pkgFile && pkgFile.main) {
        // 4. 路径的兼容（macOS/window）
        return formatPath(path.resolve(dir, pkgFile.main));
      }
    }
    return null;
  }
}

module.exports = Package;
