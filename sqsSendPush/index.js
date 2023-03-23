'use strict'

// require('dotenv').config();
const fcmPush = require('./handlers/fcmPush');

module.exports.handler = function (event, context) {

  console.log(event,'evnt');
  event.Records.forEach(
    (record) => {

      fcmPush.execute(record);
    }
  );

  return {};
}
