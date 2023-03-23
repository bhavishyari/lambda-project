'use strict'

const processor = require('./handlers/processor');

module.exports.handler = function (event, context) {

  event.Records.forEach(
    (record) => {

      processor.execute(record);
    }
  );

  return {};
}
