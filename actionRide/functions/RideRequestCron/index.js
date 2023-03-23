'use strict'

const rideRequestCron = require('../../handlers/v1/rideRequestCron');
var cron = require('node-cron');

module.exports.handler = async event => {

  // setInterval(function () {
  //   // rideRequestCron.requestCron()
  // }, 5000);

  return rideRequestCron.requestCron();

  // return {
  //   statusCode: 200,
  //   body: JSON.stringify(true)
  // }

}