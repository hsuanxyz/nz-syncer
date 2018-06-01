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
      .then(data => {
        if (data === null) {
          return Promise.resolve()
        } else {
          return this.syncStyle(data)
        }
      })
      .then(() => setTimeout(() => this.run(), 1000 * 60))
      .catch((e) => {
        logger.error(`run error \n${e}`);
        return setTimeout(() => this.run(), 1000 * 60 * 2)
      });
  }

  /**
   * @return {Promise<any>}
   */
  async checkUpdate() {
    logger.info(`Checking update`);
    const commit = await this.github.getHEADCommit();
    const release = await this.github.getLatestRelease({
      owner: 'ant-design',
      repo : 'ant-design'
    });
    const latestHEAD = commit.data.sha;
    logger.info(`NG-ZORRO latest sha: ${latestHEAD}`);
    const latestTag = release.data.tag_name;
    logger.info(`ant-design tag: ${latestTag}`);
    const branchName = `sync-style/${latestTag}`;
    logger.info(`Checking PR`);
    const prs = await this.github.getPullRequestsByHead(branchName);
    const isUpdate = (prs.data && prs.data.length === 0) || prs.data[0].base.sha !== latestHEAD;
    const number = prs.data[0] && prs.data[0].number;
    const outPrs = await this.github.getOutPullRequests();
    const _outPrs = outPrs.data.filter(e => e.head.ref.indexOf('sync-style') !== -1 && e.head.ref !== branchName);
    await Promise.all(_outPrs.map(async e => await this.github.closePullRequest(e.number)));
    if (prs.data && prs.data.length === 0) {
      logger.info(`Not found PR, so create`);
    } else if (prs.data[0].base.sha !== latestHEAD) {
      logger.info(`Found PR, but not the latest, so update this PR`);
    } else {
      logger.info(`No update, done!`);
    }
    return Promise.resolve(isUpdate ? { branchName, latestHEAD, latestTag, number } : null);
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
