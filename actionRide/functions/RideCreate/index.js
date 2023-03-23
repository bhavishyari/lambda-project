'use strict'

const ride = require('./../../handlers/v1/ride');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
 
  return ride.create(event);
}
