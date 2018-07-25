require('dotenv').config();
const fs = require('fs-extra');
const Bot = require('./scripts/bot');

const token = process.env.GITHUB_TOKEN || 'Invalid token';
const originOwner = process.env.GITHUB_ORIGIN_OWNER || 'ng-zorro-bot';
const upstreamOwner = process.env.GITHUB_UPSTREAM_OWNER || 'ng-zorro-bot';
const username = process.env.GITHUB_ORIGIN_USERNAME || 'ng-zorro-bot';
const userEmail = process.env.GITHUB_ORIGIN_USER_EMAIL || 'ng-zorro@users.noreply.github.com';


const interval = process.env.INTERVAL || 1000 * 60;

const bot = new Bot({token, originOwner, upstreamOwner, username, userEmail});

bot.run(interval);

module.exports = async () => {
  const log = await fs.readFile('./bot.log', 'utf8');
  const logHTML = log.split('\n')
    .filter(line => line.trim())
    .map((line) => {
      const l = JSON.parse(line);
      return `<span class="line ${l.level}"><span class="date">${new Date(l.timestamp).toLocaleString()}</span>&nbsp;<span class="level">${l.level}</span>:&nbsp;<span class="message">${l.message}</span></span></span>`
    }).join('\n').trim();
  const style = `<style type="text/css">
  body {
    background: #000;
  }

  pre {
    font-size: 12px;
    font-family: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;
    line-height: 20px;
    margin: 0;
    white-space: pre-wrap;
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .line {
    color: #eee;
  }
  
  .index, .date {
    color: #999;
  }
  
  .info .level {
    color: aquamarine;
  }

  .error .level {
    color: brown;
  }
  
  .error .message {
    color: coral;
  }

</style>
    `;
  return `
  ${style}
  <pre>${logHTML}</pre>
  `
};
