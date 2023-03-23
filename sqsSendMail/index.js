'use strict'

// require('dotenv').config();
const mailer = require('./handlers/mailer');

module.exports.handler = function (event, context) {

  event.Records.forEach(
    (record) => {

      mailer.execute(record);
    }
  );

  return {};
}
