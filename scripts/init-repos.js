const git = require('simple-git/promise');
const request = require('request');
const unzip = require('unzip');
const fs = require('fs-extra');
const path = require('path');

function download(url, dest) {
  return new Promise(resolve => {
    request(url)
      .pipe(fs.createWriteStream(dest))
      .on('close', () => resolve())
  })
}

function unzipAntDesign() {
  return new Promise(resolve => {
    fs.createReadStream(path.resolve(__dirname, '../tmp/ant-design.zip'))
      .pipe(unzip.Extract({path: path.resolve(__dirname, '../tmp/ant-design')}))
      .on('close', () => resolve())
  })
}

async function downReact() {
  await fs.emptyDir(path.resolve(__dirname, '../tmp'));
  await download('https://github.com/ant-design/ant-design/archive/3.5.5.zip', path.resolve(__dirname, '../tmp/ant-design.zip'));
  await unzipAntDesign();
  await  git().silent(false).clone('https://github.com/ng-zorro-bot/ng-zorro-antd.git', path.resolve(__dirname, '../tmp/ng-zorro-antd'), {depth: 1});
}

downReact();
