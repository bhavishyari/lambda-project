'use strict'

const rideCancel = require('../../handlers/v1/rideCancel');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return rideCancel.execute(event);
}
