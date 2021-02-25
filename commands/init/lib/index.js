"use strict";

const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const userHome = require("user-home");
const Command = require("@zelda-cli-dev/command");
const log = require("@zelda-cli-dev/log");
const Package = require("@zelda-cli-dev/package");
const { spinnerStart } = require("@zelda-cli-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");
const { resolve } = require("path");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    this.projectInfo = undefined; // 项目信息
    this.template = undefined; // 模板信息
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }
  async exec() {
    try {
      // 1. 准备阶段
      this.projectInfo = await this.prepare();
      if (this.projectInfo) {
        // 2. 下载模板
        log.verbose("projectInfo", this.projectInfo);
        await this.downloadTemplate();
        // 3. 安装模板
      }
    } catch (e) {
      log.error(e.message);
    }
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过egg.js搭建一套后端系统
    // 1.2 通过npm存储项目模板
    // 1.3 将项目模板信息存储到mongodb数据库中
    // 1.4 通过egg.js获取mongodb中的数据并通过API返回

    const { projectTemplate } = this.projectInfo;
    const { npmName, version } = this.template.find(
      (v) => v.npmName === projectTemplate
    );
    const targetPath = path.resolve(userHome, ".zelda-cli-dev", "template");
    const storeDir = path.resolve(targetPath, "node_modules");
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模板...");
      try {
        await templateNpm.install();
        log.success("下载模板成功");
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      try {
        await templateNpm.update();
        log.success("更新模板成功");
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
      }
    }
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    this.template = await getProjectTemplate();
    if (!this.template || !this.template.length) {
      throw new Error("模板不存在");
    }
    const lcoalPath = process.cwd();
    let ifContinue = false;
    // 1. 判断当前目录是否为空
    if (!this.isDirEmpty(lcoalPath)) {
      // 2. 是否启动强制更新
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空，是否继续创建项目？",
          })
        ).ifContinue;
        if (!ifContinue) return;
      }
      if (ifContinue || this.force) {
        // 二次确认
        const { confimDelete } = await inquirer.prompt({
          type: "confirm",
          default: false,
          name: "confimDelete",
          message: "是否确认清空当前目录下的文件？",
        });
        // 清空当前目录
        if (confimDelete) {
          fse.emptyDirSync(lcoalPath);
        } else {
          return;
        }
      }
    }
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let projectInfo = {};
    // 选择创建项目或者组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    if (type === TYPE_PROJECT) {
      // 获取项目的基本信息
      const project = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          default: "",
          validate: function (v) {
            const done = this.async();
            // 输入的首字母和尾字符必须为英文
            // 尾字符必须为英文或数字
            // 字符仅允许"-_"
            // 合法：a，a-b，a_b，a-b-c，a_b_c，a-b1-c1，a_b1_c1
            // 不合法：1，a_，a-，a_1，a-1
            const flag = /^[a-zA-Z]+([-]*[a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[A-Za-z0-9])$/.test(
              v
            );
            setTimeout(function () {
              if (!flag) {
                done("请输入合法名称!");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => v,
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入版本号",
          default: "1.0.0",
          validate: function (v) {
            const done = this.async();
            setTimeout(function () {
              console.log("----", v);
              if (!semver.valid(v)) {
                done("请输入合法版本号!");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => (!!semver.valid(v) ? semver.valid(v) : v),
        },
        {
          type: "list",
          name: "projectTemplate",
          choices: this.createTemplateChoices(),
        },
      ]);
      projectInfo = {
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
    }
    return projectInfo;
  }

  isDirEmpty(lcoalPath) {
    const fileList = fs
      .readdirSync(lcoalPath)
      .filter(
        (file) => !file.startsWith(".") && !["node_modules"].includes(file)
      );
    return !fileList || fileList.length <= 0;
  }

  createTemplateChoices() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }
}

function init(argv) {
  // console.log("init", projectName, cmdObj.force, process.env.CLI_TARGET_PATH);
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
