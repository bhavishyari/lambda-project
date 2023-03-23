'use strict'

const rideRequest = require('../../handlers/v1/rideRequest');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return rideRequest.reject(event);
}
