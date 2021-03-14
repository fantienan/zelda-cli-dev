"use strict";

const toString = Object.prototype.toString;
function isObject(o) {
  return toString.call(o) === "[object Object]";
}

function spinnerStart(msg = "loading..", spinnerString = "|/-\\") {
  const Spinner = require("cli-spinner").Spinner;
  const spinner = new Spinner(msg + " %s");
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}
// 停顿代码
function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
// 兼容macOS window执行命令的参数，
// 在window中的参数格式是：cp.spawn("cmd", ["/c", "node", "-e", code])其中/c表示浸没执行
function exec(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return require("child_process").spawn(cmd, cmdArgs, options || {});
}
function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => {
      reject(e);
    });
    p.on("exit", (c) => {
      resolve(c);
    });
  });
};
module.exports = {
  isObject,
  spinnerStart,
  sleep,
  exec,
  execAsync
};
