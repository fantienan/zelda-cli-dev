"use strict";

const toString = Object.prototype.toString;
function isObject(o) {
  return toString.call(o) === "[object Object]";
}

module.exports = {
  isObject,
};
