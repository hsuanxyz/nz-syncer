const {download, unzip} = require("./utils");
const fs = require('fs-extra');
const path = require('path');
const Github = require('./github');
const git = require('simple-git/promise');
const glob = require('glob').sync;

class Bot {
  constructor({token}) {
    this.token = token;
    this.github = new Github({
      token,
      owner: 'NG-ZORRO',
      repo : 'ng-zorro-antd'
    });
    this.zorroPath = path.resolve(__dirname, '../tmp/ng-zorro-antd');
    this.antDesignPath = path.resolve(__dirname, '../tmp/ant-design');
  }

  /**
   * 更新样式文件
   * @return {Promise<void>}
   */
  async updateStyles() {
    const styles = [];
    const zorroComponents = glob(path.join(this.zorroPath, 'components/+(**)/style')).map(path => {
      const _path = path.split('/');
      return _path[_path.length - 2];
    });

    glob(path.join(this.antDesignPath, 'components/**/style/**/*.tsx')).forEach(path => {
      fs.removeSync(path);
    });

    zorroComponents.forEach(item => {
      const antDesignStylePath = path.join(this.antDesignPath, `components/${item}/style`);
      const zorroStylePath = path.join(this.zorroPath, `components/${item}/style`);
      const exists = fs.pathExistsSync(antDesignStylePath);
      if (exists) {
        fs.copySync(antDesignStylePath, zorroStylePath, {overwrite: true});
      }
      const indexExists = fs.pathExistsSync(path.join(zorroStylePath, 'index.less'));
      if (indexExists) {
        styles.push(`@import "./${item}/style/index.less";`);
      }
    });

    fs.copySync(path.join(this.antDesignPath, `components/style`), path.join(this.zorroPath, `components/style`), {overwrite: true});

    fs.outputFile(path.join(this.zorroPath, `components/components.less`), styles.join('\n') + '\n');
    return Promise.resolve();
  }

  /**
   * 更新库
   * @return {Promise<void>}
   */
  async getRepos() {
    const tmp = path.resolve(__dirname, '../tmp');
    await fs.emptyDir(tmp);
    const latestTagName = await this.findLatestAntDesignRelease();
    await this.cloneZorro();
    await this.asyncUpstream();
    return Promise.resolve();
  }

  /**
   * 同步上游
   * @return {Promise<void>}
   */
  async asyncUpstream() {
    const _git = git(this.zorroPath);
    await _git.addRemote('upstream', 'https://github.com/NG-ZORRO/ng-zorro-antd.git');
    await _git.fetch('upstream', 'master');
    await _git.merge({'upstream/master': null});
    await _git.push('origin', 'master');
    return Promise.resolve();
  }

  /**
   * 获取 AntDesign 最新包
   * @return {Promise<string>}
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
    await fs.rename(`${tmp}/ant-design-${tagName}`, this.antDesignPath);
    await fs.remove(latestPath);
    console.log('TASK(success): Find latest AntDesign release');
    return Promise.resolve(tagName);
  }

  /**
   * clone ng-zorro-antd
   * @return {Promise<void>}
   */
  async cloneZorro() {
    console.log('TASK: Clone ng-zorro-antd');
    await  git().silent(false).clone(`https://ng-zorro-bot:${this.token}@github.com/ng-zorro-bot/ng-zorro-antd.git`, this.zorroPath, {'--depth': 1});
    console.log('TASK(success): Clone ng-zorro-antd');
    return Promise.resolve();
  }

}

