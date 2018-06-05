require('dotenv').config();
const fs = require('fs-extra');
const Bot = require('./scripts/bot');

const token = process.env.GITHUB_TOKEN || 'Invalid token';
const originOwner = process.env.GITHUB_ORIGIN_OWNER || 'ng-zorro-bot';
const upstreamOwner = process.env.GITHUB_UPSTREAM_OWNER || 'ng-zorro-bot';

const interval = process.env.INTERVAL || 1000 * 60;

const bot = new Bot({token, originOwner, upstreamOwner});

bot.run(interval);

module.exports = async () => {
  const log = await fs.readFile('./bot.log', 'utf8');
  return log;
};
