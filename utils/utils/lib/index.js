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

module.exports = {
  isObject,
  spinnerStart,
  sleep
};
