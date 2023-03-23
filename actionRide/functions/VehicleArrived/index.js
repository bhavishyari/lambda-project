'use strict'

const vehicleArrived = require('../../handlers/v1/vehicleArrived');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return vehicleArrived.execute(event);
}
