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

/** 从 CHANGELOG.md 提取指定版本段落，转成 appcast desc 用的 HTML（换行→<br>） */
const changelogDesc = (version) => {
  try {
    const md = fs.readFileSync(path.resolve(__dirname, '../CHANGELOG.md'), 'utf8');
    const lines = md.split('\n');
    const start = lines.findIndex((l) => /^## /.test(l) && l.trim().startsWith(`## ${version} `));
    if (start === -1) return '';
    const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
    const html = lines
      .slice(start + 1, end === -1 ? lines.length : end)
      .map((l) => l.trim().replace(/^#{1,6}\s*/, '').replace(/^[-*+]\s+/, '· ')) // 去掉 Markdown 标记，纯文本
      .filter(Boolean) // 去空行，避免首尾/连续 <br>
      .join('<br>');
    return html;
  } catch (e) {
    return '';
  }
};

module.exports = () => {
  const pkgPath = path.resolve(__dirname, `../release/${pkg}`);
  const appcastPath = path.join(__dirname, '../src/appcast.json');

  const fileBuffer = fs.readFileSync(pkgPath);
  const sum = crypto.createHash('sha256');
  sum.update(fileBuffer);
  const hex = sum.digest('hex');

  const version = {
    version: plugInfo.version,
    desc: changelogDesc(plugInfo.version) || `${repositoryUrl}/blob/${defaultBranch}/CHANGELOG.md#v${plugInfo.version}`,
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
