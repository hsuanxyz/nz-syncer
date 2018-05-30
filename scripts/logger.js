const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
    winston.format.align(),
    winston.format.printf(info => `${info.timestamp} ${info.level}:${info.message}`)
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(info => `${info.level}:${info.message}`),
      )
    }),
    new winston.transports.File({ filename: path.resolve(__dirname, '../bot.log')})
  ]
});

module.exports = logger;
