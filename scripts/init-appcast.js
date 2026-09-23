/*
 * @Author: ifyour
 * @Description: 根据配置文件(config.js,info.json) 生成 appcast.json 版本更新文件
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const config = require('./config');
const plugInfo = require('../src/info.json');
const plugAppcast = require('../src/appcast.json');

const pkg = `${config.pkgName}-v${plugInfo.version}.bobplugin`;
const defaultBranch = 'main';
const repositoryUrl = `https://github.com/${config.github.username}/${config.github.repository}`;
const releaseUrl = `${repositoryUrl}/releases/download`;

/** 版本条目字段顺序固定，便于 review 与 diff */
const fieldOrder = ['version', 'desc', 'sha256', 'url', 'minBobVersion'];

module.exports = () => {
  const pkgPath = path.resolve(__dirname, `../release/${pkg}`);
  const appcastPath = path.join(__dirname, '../src/appcast.json');

  const fileBuffer = fs.readFileSync(pkgPath);
  const sum = crypto.createHash('sha256');
  sum.update(fileBuffer);
  const hex = sum.digest('hex');

  const version = {
    version: plugInfo.version,
    desc: `${repositoryUrl}/blob/${defaultBranch}/CHANGELOG.md#v${plugInfo.version}`,
    sha256: hex,
    url: `${releaseUrl}/v${plugInfo.version}/${pkg}`,
    minBobVersion: plugInfo.minBobVersion,
  };

  let versions = (plugAppcast && plugAppcast.versions) || [];
  if (!Array.isArray(versions)) versions = [];
  const index = versions.findIndex((v) => v.version === plugInfo.version);
  if (index === -1) {
    versions.splice(0, 0, version);
  } else {
    versions.splice(index, 1, version);
  }

  // 统一字段顺序，新版本在前
  versions = versions
    .map((v) => Object.fromEntries(fieldOrder.map((k) => [k, v[k]])))
    .sort((a, b) => String(b.version).localeCompare(String(a.version), undefined, { numeric: true }));

  const appcastData = { identifier: plugInfo.identifier, versions };
  fs.mkdirSync(path.dirname(appcastPath), { recursive: true });
  fs.writeFileSync(appcastPath, JSON.stringify(appcastData, null, 2) + '\n');
};
