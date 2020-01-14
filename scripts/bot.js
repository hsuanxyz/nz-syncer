const path = require('path');
const Github = require('./github');
const logger = require('./logger');
const StyleSyncer = require('./style-syncer');
const semver = require('semver');


class Bot {
  constructor({token, upstreamOwner, originOwner, username, userEmail}) {
    this.token = token;
    this.username = username;
    this.userEmail = userEmail;
    this.github = new Github({
      token,
      originOwner,
      upstreamOwner,
      repo: 'ng-zorro-antd'
    });
    this.zorroPath = path.resolve(__dirname, '../tmp/ng-zorro-antd');
    this.antDesignPath = path.resolve(__dirname, '../tmp/ant-design');
    logger.info(`========================= NG-ZORRO Syncer ==========================`);
  }

  checkOnceWithVersion(version) {
    this.checkUpdate(version)
      .then(data => {
        if (data !== null) {
          return this.syncStyle(data);
        }
      })
  }

  run(interval) {
    this.checkUpdate()
      .then(data => {
        if (data === null) {
          return Promise.resolve();
        } else {
          return this.syncStyle(data);
        }
      })
      .then(() => setTimeout(() => this.run(interval), interval))
      .catch((e) => {
        logger.error(`run error \n${e}`);
        return setTimeout(() => this.run(interval), interval);
      });
  }

  /**
   * @return {Promise<any>}
   */
  async checkUpdate(version) {
    logger.info(`Checking update`);
    const commit = await this.github.getHEADCommit();
    const release = await this.github.getLatestRelease({
      owner: 'ant-design',
      repo: 'ant-design'
    });
    const latestHEAD = version || commit.data.sha;
    logger.info(`NG-ZORRO latest sha: ${latestHEAD}`);
    const latestTag = release.data.tag_name;
    logger.info(`ant-design tag: ${latestTag}`);
    if (semver.prerelease(latestTag) !== null) {
      return Promise.resolve(null);
    }
    const branchName = `${version ? 'force' : 'sync-style'}/${latestTag}`;
    logger.info(`Checking PR`);
    const prs = await this.github.getPullRequestsByHead(branchName);
    const isUpdate = (prs.data && prs.data.length === 0) || prs.data[0].base.sha !== latestHEAD;
    const number = prs.data[0] && prs.data[0].number;
    const outPrs = await this.github.getOutPullRequests();
    const _outPrs = outPrs.data.filter(e => e.head.ref.indexOf('sync-style') !== -1 && e.head.ref !== branchName);
    await Promise.all(_outPrs.map(async e => await this.github.closePullRequest(e.number)));
    if (prs.data && prs.data.length === 0) {
      logger.info(`Not found PR, so create`);
    } else if (prs.data[0].base.sha !== latestHEAD && prs.data[0].merged_at === null) {
      logger.info(`Found PR, but not the latest, so update this PR`);
    } else {
      logger.info(`No update, done!`);
      return Promise.resolve(null);
    }
    return Promise.resolve(isUpdate ? {branchName, latestHEAD, latestTag, number} : null);
  }

  syncStyle(options) {
    const styleSyncer = new StyleSyncer({
      token: this.token,
      github: this.github,
      zorroPath: this.zorroPath,
      antDesignPath: this.antDesignPath,
      username: this.username,
      userEmail: this.userEmail,
      ...options
    });
    return styleSyncer.run()
  }

}

module.exports = Bot;
