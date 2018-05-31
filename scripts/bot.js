const path = require('path');
const Github = require('./github');
const logger = require('./logger');
const StyleSyncer = require('./style-syncer');

class Bot {
  constructor({token}) {
    this.token = token;
    this.github = new Github({
      token,
      owner: 'ng-zorro-bot',
      repo : 'ng-zorro-antd'
    });
    this.zorroPath = path.resolve(__dirname, '../tmp/ng-zorro-antd');
    this.antDesignPath = path.resolve(__dirname, '../tmp/ant-design');
    logger.info(`========================= NG-ZORRO GitHub Bot(styles-syncer) ==========================`);
  }

  run() {
    this.checkUpdate()
      .then(branchName => branchName !== '' ? this.syncStyle({branchName}) : Promise.resolve())
      .then(() => setTimeout(() => this.run(), 1000 * 60))
      .catch((e) => {
        logger.error(`run error \n${e}`);
        return setTimeout(() => this.run(), 1000 * 60 * 2)
      });
  }

  /**
   * @return {Promise<string>}
   */
  async checkUpdate() {
    const commit = await this.github.getHEADCommit();
    const release = await this.github.getLatestRelease({
      owner: 'ant-design',
      repo : 'ant-design'
    });
    const latestHEAD = commit.data.sha;
    const latestTag = release.data.tag_name;
    const branchName = `sync-style/${latestHEAD.slice(0, 7)}-${latestTag}`;
    const prs = await this.github.getPullRequestsByHead(branchName);
    const isUpdate = prs.data && prs.data.length === 0;
    if (isUpdate) {
      const outPrs = await this.github.getOutPullRequests();
      if (outPrs && outPrs.data.length) {
        const _outPrs = outPrs.data.filter(e => e.title.indexOf('chore: update styles') !== -1);
        await Promise.all(_outPrs.map(async e => await this.github.closePullRequest(e.number)))
      }
    }
    logger.info(`Check update ${latestHEAD}...${latestTag}`);
    return Promise.resolve(isUpdate ? branchName : '');
  }

  syncStyle(options) {
    const styleSyncer = new StyleSyncer({
      token        : this.token,
      github       : this.github,
      zorroPath    : this.zorroPath,
      antDesignPath: this.antDesignPath,
      ...options
    });
    return styleSyncer.run()
  }

}

module.exports = Bot;
