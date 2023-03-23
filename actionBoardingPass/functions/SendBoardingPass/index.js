'use strict'

const boardingPass = require('./../../handlers/v1/boardingPass');

module.exports.handler = async event => {
  event.body = JSON.parse(event.body);
  return boardingPass.send(event);
}
