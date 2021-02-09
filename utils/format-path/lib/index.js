"use strict";
const path = require("path");

// 兼容macOS\window路径
module.exports = function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep;
    if (sep === "/") {
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  return p;
};
