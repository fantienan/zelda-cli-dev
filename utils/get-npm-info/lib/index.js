"use strict";
const axios = require("axios");
const semver = require("semver");
const urlJoin = require("url-join");
// 获取npm info http://registry.npmjs.org/{npmName}
async function getNpmInfo(npmName, registry) {
  if (!npmName) return null;
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  const response = await axios.get(npmInfoUrl);
  if (response.status === 200) {
    return response.data;
  }
  return null;
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "http://registry.npmjs.org"
    : "http://registry.npm.taobao.org";
}
// 获取版本号数组
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  }
  return [];
}
// 获取大于当前版本号的数组并降序排序
function getSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.gt(b, a));
}
// 获取最新版本号
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions) {
    return versions.sort((a, b) => semver.gt(b, a))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion
};
