const {download, unzip} = require("./utils");
const fs = require('fs-extra');
const path = require('path');
const Github = require('./github');
const git = require('simple-git/promise');
const glob = require('glob').sync;
const logger = require('./logger');

class StyleSyncer {

  constructor({
                token,
                github,
                skipComponents,
                skipIndex,
                skipComponent,
                zorroPath,
                antDesignPath,
                number,
                branchName
              }) {
    this.token = token;
    this.github = github;
    this.skipComponents = skipComponents || [];
    this.skipIndex = !!skipIndex;
    this.skipComponent = !!skipComponent;
    this.zorroPath = zorroPath;
    this.antDesignPath = antDesignPath;
    this.number = number;
    this.branchName = branchName;
  }

  async run() {
    await this.getRepos();
    const branchName = await this.createBranch();
    logger.info(`Update styles`);
    await this.updateStyles();
    const diff = await git(this.zorroPath).diffSummary();
    logger.info(`Changed files(${diff.files.length})`);
    if (diff.files.length === 0) {
      logger.info(`No changes, the task stop`);
      return Promise.resolve(0)
    }
    const diffTable = this.generationDiffTable(diff);
    await git(this.zorroPath).add(diff.files.map(file => file.file));
    await git(this.zorroPath).commit(`chore: update styles`, {'--author': 'ng-zorro-bot \<ng-zorro-bot@users.noreply.github.com\>'});
    await git(this.zorroPath).push('origin', branchName, {'-f': null});
    logger.info(`Create PullRequests`);
    try {
      await this.github.createPullRequests(branchName, `chore: update styles ${branchName}`, diffTable);
      logger.info(`Create PR success`);
    } catch (e) {
      logger.error(`Create PR error \n${e}`);
    }
    logger.info(`Task done!`);
    return Promise.resolve(diff.files.length)
  }

  /**
   * @param diff {DiffResult}
   * @return {string}
   */
  generationDiffTable(diff) {
    let diffTable = "| file | changes | insertions(+) deletions(-) | \n | --- | --- | --- | \n";
    diff.files.forEach(item => {
      diffTable += `| ${item.file} | ${item.changes} | ${new Array(item.insertions).fill('+').join('')}${new Array(item.deletions).fill('-').join('')} | \n`
    });
    return diffTable;
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

    // 移除 style 下 tsx
    glob(path.join(this.antDesignPath, 'components/**/style/**/*.tsx')).forEach(path => {
      fs.removeSync(path);
    });

    // 覆盖 style 文件
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

    // 重新生成 components.less
    fs.outputFile(path.join(this.zorroPath, `components/components.less`), styles.join('\n') + '\n');
    return Promise.resolve();
  }

  /**
   * 获取库
   * @return {Promise<string>}
   */
  async getRepos() {
    const tmp = path.resolve(__dirname, '../tmp');
    await fs.emptyDir(tmp);
    const latestTagName = await this.findLatestAntDesignRelease();
    await this.cloneZorro();
    await this.syncUpstream();
    return Promise.resolve(latestTagName);
  }

  /**
   * 创建分支
   * @param name
   * @return {Promise<string>}
   */
  async createBranch() {
    const branchName = this.branchName;
    await git(this.zorroPath).checkout('master');
    try {
      logger.info(`Create branch ${branchName}`);
      await git(this.zorroPath).checkoutLocalBranch(branchName);
      logger.info(`Create branch success and checkout to ${branchName}`);
      return Promise.resolve(branchName);
    } catch (e) {
      logger.error(`Create branch error \n${e}`);
      return Promise.resolve(branchName);
    }
  }

  /**
   * 同步上游
   * @return {Promise<void>}
   */
  async syncUpstream() {

    try {
      logger.info(`Syncing upstream(https://github.com/NG-ZORRO/ng-zorro-antd.git)`);
      const _git = git(this.zorroPath);
      await _git.addRemote('upstream', 'https://github.com/NG-ZORRO/ng-zorro-antd.git');
      await _git.fetch('upstream', 'master');
      await _git.merge({'upstream/master': null});
      await _git.push('origin', 'master');
      logger.info(`Sync success`);
      return Promise.resolve();
    } catch (e) {
      logger.error(`Sync error \n${e}`);
      return Promise.reject(e);
    }

  }

  /**
   * 获取 AntDesign 最新包
   * @return {Promise<string>}
   */
  async findLatestAntDesignRelease() {
    logger.info('Getting latest AntDesign version');
    const tmp = path.resolve(__dirname, '../tmp');
    const result = await this.github.getLatestRelease({
      owner: 'ant-design',
      repo : 'ant-design'
    });
    const tagName = result.data.tag_name;
    logger.info(`Latest version ${tagName}`);
    const latestUrl = `https://github.com/ant-design/ant-design/archive/${tagName}.zip`;
    const latestPath = `${tmp}/ant-design-latest.zip`;

    logger.info(`Downloading ant-design-${tagName} from ${latestUrl}`);

    try {
      await download(latestUrl, latestPath);
      logger.info(`Download success ${latestPath}`);
    } catch (e) {
      logger.error(`Download error \n${e}`);
      return Promise.reject(e);
    }

    try {
      logger.info(`Unzip ${latestUrl}`);
      await unzip(latestPath, `${tmp}`);
    } catch (e) {
      logger.error(`Unzip error \n${e}`);
      return Promise.reject(e);
    }

    try {
      await fs.rename(`${tmp}/ant-design-${tagName}`, this.antDesignPath);
      await fs.remove(latestPath);
      logger.info(`Rename done ${this.antDesignPath}`);
    } catch (e) {
      logger.error(`Rename error \n${e}`);
      return Promise.reject(e);
    }

    return Promise.resolve(tagName);
  }

  /**
   * clone ng-zorro-antd
   * @return {Promise<void>}
   */
  async cloneZorro() {
    logger.info(`Clone ng-zorro-antd from https://github.com/ng-zorro-bot/ng-zorro-antd.git`);

    try {
      await  git().silent(false).clone(`https://ng-zorro-bot:${this.token}@github.com/ng-zorro-bot/ng-zorro-antd.git`, this.zorroPath, {'--depth': 1});
      logger.info(`Clone success ${this.zorroPath}`);
      return Promise.resolve();
    } catch (e) {
      logger.error(`Clone error \n${e}`);
      return Promise.reject(e);
    }
  }
}

module.exports = StyleSyncer;
