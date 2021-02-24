"use strict";

const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const Command = require("@zelda-cli-dev/command");
const log = require("@zelda-cli-dev/log");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }
  async exec() {
    try {
      // 1. 准备阶段
      await this.prepare();
      // 2. 下载模板
      // 3. 安装模板
    } catch (e) {
      log.error(e.message);
    }
  }

  async prepare() {
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
        }
      }
    }
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
    return this.getProjectInfo();
  }

  async getProjectInfo() {
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
      const o = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: "请输入项目名称",
        default: "",
        validate: function(v) {
          return typeof v === "string"
        },
        filter: function(v) {
          return v
        }
      }, {
        type: "input",
        name: "projectVersion",
        message: "请输入版本号",
        default: "",
        validate: function(v) {
          return typeof v === "string"
        },
        filter: function(v) {
          return v
        }
      }])
    } else if (type === TYPE_COMPONENT) {
      
    }
  }

  isDirEmpty(lcoalPath) {
    const fileList = fs
      .readdirSync(lcoalPath)
      .filter(
        (file) => !file.startsWith(".") && !["node_modules"].includes(file)
      );
    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  // console.log("init", projectName, cmdObj.force, process.env.CLI_TARGET_PATH);
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
