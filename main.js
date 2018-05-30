require('dotenv').config();
const Bot = require('./scripts/bot');

const token = process.env.GITHUB_TOKEN || 'Invalid token';
console.log(token);
const bot = new Bot({token});

bot.run();
