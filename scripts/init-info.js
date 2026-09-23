/*
 * @Author: ifyour
 * @Description: 使用 package.json 里面的部分字段(version, author, homepage, description)覆盖 info.json 里面的数据
 */
const path = require('path');
const fs = require('fs');

const config = require('./config');
const info = require('../src/info.json');
const packageJson = require('../package.json');

const appcast = `https://raw.githubusercontent.com/${config.github.username}/${config.github.repository}/main/src/appcast.json`;

const { version, author = '', homepage = '', description = '' } = packageJson;
const infoData = { ...info, version, author, homepage, summary: description, appcast };
const infoPath = path.join(__dirname, '../src/info.json');

fs.mkdirSync(path.dirname(infoPath), { recursive: true });
fs.writeFileSync(infoPath, JSON.stringify(infoData, null, 2) + '\n');
