require('dotenv').config();
const fs = require('fs-extra');
const Bot = require('./scripts/bot');

const token = process.env.GITHUB_TOKEN || 'Invalid token';
console.log(token);
const bot = new Bot({token});

bot.run();

module.exports = async () => {
  const log = await fs.readFile('./bot.log', 'utf8');
  return log;
};
