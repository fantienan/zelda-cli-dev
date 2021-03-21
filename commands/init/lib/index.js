"use strict";

const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const ejs = require("ejs");
const glob = require("glob");
const inquirer = require("inquirer");
const semver = require("semver");
const userHome = require("user-home");
const Command = require("@zelda-cli-dev/command");
const log = require("@zelda-cli-dev/log");
const Package = require("@zelda-cli-dev/package");
const { spinnerStart, execAsync } = require("@zelda-cli-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal"; // 标准模板
const TEMPLATE_TYPE_CUSTOM = "custom"; // 自定义模板
const WHITE_COMMAND = ["npm", "cnpm"]; // 白名单
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    this.projectInfo = undefined; // 项目信息
    this.template = undefined; // 模板信息
    this.templateInfo = undefined; // 用户选择的模板信息
    this.templateNpm = undefined; // 用户选择的模板npm信息
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
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e)
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准类型
        this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义类型
        this.installCustomTemplate();
      } else {
        throw new Error("项目模板类型无法识别！");
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, msg) {
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error("命令不存在！命令：" + command);
      }
      const args = cmdArray.slice(1);
      const ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      if (ret !== 0) {
        throw new Error(msg);
      }
    }
  }
  // 模板渲染
  async ejsRender(options) {
    const dir = process.cwd();
    return new Promise((resolve, reject) => {
      glob("**", {
        cwd: dir,
        ignore: options.ignore,
        nodir: true,
      }, (err, files) => {
        if (err) {
          return reject(err);
        }
        Promise.all(files.map((file) => {
          const filePath = path.join(dir, file);
          return new Promise((res, rej) => {
            ejs.renderFile(filePath, this.projectInfo, {}, (err, result) => {
              if (err) {
                rej(err)
              } else {
                fse.writeFileSync(filePath, result)
                res(result)
              }
            })
          })
        })).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      }
      );
    });
  }
  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拷贝模板代码至当前路径
    const templatePath = path.resolve(
      this.templateNpm.cacheFilePath,
      "template"
    );
    let spinner = spinnerStart("正在安装模板...");
    try {
      const targetPath = process.cwd();
      // 确保目录存在，不存在时自动创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }
    const ignore = ["node_modules/**", ...this.templateInfo.ignore || []];
    await this.ejsRender({ ignore });
    const { installCommand, startCommand } = this.templateInfo;
    // 安装依赖
    await this.execCommand(installCommand, "依赖安装过程失败！");
    // 启动命令执行
    await this.execCommand(startCommand, "启动命令执行失败！");
  }

  async installCustomTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 查询自定义模板的入口文件
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板')
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          "template"
        );
        const options = JSON.stringify({
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd()
        })
        const code = `require('${rootFile}')(${options})`
        log.verbose('code', code)
        await execAsync('node', ['-e', code], { stdio: 'inherit', cwd: process.cwd() })
        log.success('自定义模板安装成功')
      } else {
        throw new Error('自定义模板入口文件不存在！')
      }
    }
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过egg.js搭建一套后端系统
    // 1.2 通过npm存储项目模板
    // 1.3 将项目模板信息存储到mongodb数据库中
    // 1.4 通过egg.js获取mongodb中的数据并通过API返回

    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (v) => v.npmName === projectTemplate
    );
    this.templateInfo = templateInfo;
    log.verbose("templateInfo", this.templateInfo)
    const targetPath = path.resolve(userHome, ".zelda-cli-dev", "template");
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = templateInfo;
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
      } catch (e) {
        throw e;
      } finally {
        if (await templateNpm.exists()) {
          this.templateNpm = templateNpm;
          log.success("更新模板成功");
        }
        spinner.stop(true);
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          this.templateNpm = templateNpm;
          log.success("更新模板成功");
        }
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
    function isValidName(name) {
      // 输入的首字母和尾字符必须为英文
      // 尾字符必须为英文或数字
      // 字符仅允许"-_"
      // 合法：a，a-b，a_b，a-b-c，a_b_c，a-b1-c1，a_b1_c1
      // 不合法：1，a_，a-，a_1，a-1
      return /^[a-zA-Z]+([-]*[a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[A-Za-z0-9])$/.test(name)
    }
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
    const title = type === TYPE_PROJECT ? "项目" : "组件"
    this.template = this.template.filter(t => t.tag.includes(type))
    const isProjectNameValid = isValidName(this.projectName)
    const projectPrompt = [
      {
        type: "input",
        name: "projectVersion",
        message: "请输入版本号",
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
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
        message: "请选择模板",
        choices: this.createTemplateChoices(),
      }
    ]
    if (isProjectNameValid) {
      projectInfo.projectName = this.projectName
    } else {
      projectPrompt.unshift({
        type: "input",
        name: "projectName",
        message: `请输入${title}名称`,
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!isValidName(v)) {
              done("请输入合法名称!");
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: (v) => v,
      })
    }
    if (type === TYPE_PROJECT) {
      // 获取项目的基本信息
      projectPrompt.push()
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      // 获取组件基本信息
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: `请输入${title}描述信息`,
        default: "",
        validate: function (v) {
          const done = this.async()
          if (!v) {
            done("请输入组件描述信息")
            return
          }
          done(null, true)
        }
      }
      projectPrompt.push(descriptionPrompt)
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    // 生成className 修改模板package.json name用
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
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