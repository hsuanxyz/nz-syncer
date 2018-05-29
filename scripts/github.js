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
}

module.exports = Github;
