const {download, unzip} = require("./utils");
const fs = require('fs-extra');
const path = require('path');
const Github = require('./github');
const git = require('simple-git/promise');

class Bot {
  constructor({token}) {
    this.token = token;
    this.github = new Github({
      owner: 'NG-ZORRO',
      repo : 'ng-zorro-antd'
    })
  }

  async updateRepos() {
    const tmp = path.resolve(__dirname, '../tmp');
    await fs.emptyDir(tmp);
    await this.findLatestAntDesignRelease();
    await this.cloneZorro();
    await this.asyncUpstream();
  }

  /**
   * 同步上游
   * @return {Promise<void>}
   */
  async asyncUpstream() {
    const zorroPath = path.resolve(__dirname, '../tmp/ng-zorro-antd');
    const _git = git(zorroPath);
    await _git.addRemote('upstream', 'https://github.com/NG-ZORRO/ng-zorro-antd.git');
    await _git.fetch('upstream', 'master');
    await _git.merge({ 'upstream/master': null });
    await _git.push('origin', 'master');
    return Promise.resolve();
  }

  /**
   * 获取 AntDesign 最新包
   * @return {Promise<void>}
   */
  async findLatestAntDesignRelease() {
    console.log('TASK: Find latest AntDesign release');
    const tmp = path.resolve(__dirname, '../tmp');
    const result = await this.github.getLatestRelease({
      owner: 'ant-design',
      repo : 'ant-design'
    });
    const tagName = result.data.tag_name;
    const latestUrl = `https://github.com/ant-design/ant-design/archive/${tagName}.zip`;
    const latestPath = `${tmp}/ant-design-latest.zip`;
    await download(latestUrl, latestPath);
    await unzip(latestPath, `${tmp}`);
    await fs.rename(`${tmp}/ant-design-${tagName}`, `${tmp}/ant-design`);
    await fs.remove(latestPath);
    console.log('TASK(success): Find latest AntDesign release');
    return Promise.resolve();
  }

  /**
   * clone ng-zorro-antd
   * @return {Promise<void>}
   */
  async cloneZorro() {
    console.log('TASK: Clone ng-zorro-antd');
    const zorroPath = path.resolve(__dirname, '../tmp/ng-zorro-antd');
    await  git().silent(false).clone(`https://ng-zorro-bot:${this.token}@github.com/ng-zorro-bot/ng-zorro-antd.git`, zorroPath, {'--depth': 1});
    console.log('TASK(success): Clone ng-zorro-antd');
    return Promise.resolve();
  }

}

