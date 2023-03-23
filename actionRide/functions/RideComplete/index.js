'use strict'

const rideComplete = require('../../handlers/v1/rideComplete');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return rideComplete.execute(event);
}
