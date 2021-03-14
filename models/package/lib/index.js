"use strict";
const path = require("path");
const pathExists = require("path-exists").sync;
const pkgDir = require("pkg-dir").sync;
const npminstall = require("npminstall");
const fse = require("fs-extra");
const { isObject } = require("@zelda-cli-dev/utils");
const formatPath = require("@zelda-cli-dev/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@zelda-cli-dev/get-npm-info");
/**
 * 加载包的基类
 */
class Package {
  /**
   * @param {Object} options
   * @param {String} options.targetPath - package的目标路径
   * @param {String} options.storeDir - package的缓存路径
   * @param {String} options.packageName - package的name
   * @param {String} options.packageVersion - package的version
   */
  constructor(options) {
    if (!isObject(options)) {
      throw new Error("Package类的options必须为对象");
    }
    this.targetPath = options.targetPath;
    this.storeDir = options.storeDir;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;
    // 缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }
  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirsSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
      console.log("prepare", this.packageVersion);
    }
  }

  // 需要拼出这样的包名：_@imooc-cli_init@1.1.2@@imooc-cli
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }
  // 判断当前Package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }
  // 安装Package
  async install() {
    await this.prepare();
    await npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }
  // 更新Package
  async update() {
    await this.prepare();
    // 获取最新的版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 如果不存在则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
  }
  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFilePath(targetPath) {
      // 1. 获取package.json所在目录
      const dir = pkgDir(targetPath);
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
    if (this.storeDir) {
      return _getRootFilePath(this.cacheFilePath);
    } else {
      return _getRootFilePath(this.targetPath);
    }
  }
}

module.exports = Package;
