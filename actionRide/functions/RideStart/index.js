'use strict'

const rideStart = require('../../handlers/v1/rideStart');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return rideStart.execute(event);
}
