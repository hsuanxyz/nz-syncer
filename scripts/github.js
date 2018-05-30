const octokit = require('@octokit/rest');

class Github {

  constructor({owner, repo, token}) {
    this._owner = owner;
    this._repo = repo;
    this._github = octokit({
      timeout: 0,
      headers: {
        accept: 'application/vnd.github.v3+json',
        'user-agent': 'NG-ZORRO GitHub Bot v0.0.1'
      },
      baseUrl: 'https://api.github.com',
      agent: undefined
    });
    this._github.authenticate({
      type: 'oauth',
      token: token || 'invalid token'
    });
  }

  async getLatestRelease({owner, repo} = {owner: this._owner, repo: this._repo}) {
    return this._github.repos.getLatestRelease({owner, repo})
  }

  async getUser() {
    return this._github.users.get();
  }

  async getHEADCommit() {
    return this._github.repos.getCommit({
      owner: 'NG-ZORRO',
      repo: this._repo,
      sha: 'HEAD'
    })
  }

  async getPullRequestsByHead(head) {
    return this._github.pullRequests.getAll({
      owner:  this._owner,
      repo: this._repo,
      head: `${this._owner}:${head}`
    })
  }

  async getBranch(branch) {
    return this._github.repos.getBranch({
      branch,
      owner: this._owner,
      repo: this._repo,
    })
  }

  async createPullRequests(branch, title, body) {
    return this._github.pullRequests.create({
      title,
      body,
      owner: this._owner,
      repo: this._repo,
      head: `${this._owner}:${branch}`,
      base: 'master',
      maintainer_can_modify: true
    })
  }
}

module.exports = Github;