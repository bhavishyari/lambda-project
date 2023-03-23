'use strict'

require('dotenv').config();
const Api = require('claudia-api-builder');
const api = new Api();

const ride = require('./handlers/v1/ride');
const rideRequest = require('./handlers/v1/rideRequest');
const rideComplete = require('./handlers/v1/rideComplete');
const rideStart = require('./handlers/v1/rideStart');
const rideCancel = require('./handlers/v1/rideCancel');

// DEV Base URL: https://0d66zwjkf8.execute-api.us-west-2.amazonaws.com/latest

// create ride
api.post('/v1/ride/create', (request) => {
  return ride.create(request);
});

// accept ride
api.post('/v1/ride-request/accept', (request) => {
  return rideRequest.accept(request);
});

// reject ride request
api.post('/v1/ride-request/reject', (request) => {
  return rideRequest.reject(request);
});

// start ride, with ride QR verification..
api.post('/v1/ride/start', (request) => {
  return rideStart.execute(request);
});

// cancel ride
api.post('/v1/ride/cancel', (request) => {
  return rideCancel.execute(request);
});

// complete ride
api.post('/v1/ride/complete', (request) => {
  return rideComplete.execute(request);
});

module.exports = api;

/*
// all above api deployed with serverless:
Serverless: Stack update finished...
Service Information
service: action-ride
stage: dev
region: us-west-2
stack: action-ride-dev
resources: 44
api keys:
  None
endpoints:
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride/create
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride-request/accept
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride-request/reject
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride/start
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride/cancel
  POST -    https://3p7d4880ma.execute-api.us-west-2.amazonaws.com/dev/v1/ride/complete
functions:
  rideCreate: action-ride-dev-rideCreate
  rideRequestAccept: action-ride-dev-rideRequestAccept
  rideRequestReject: action-ride-dev-rideRequestReject
  rideStart: action-ride-dev-rideStart
  rideCancel: action-ride-dev-rideCancel
  rideComplete: action-ride-dev-rideComplete
layers:
  None
*/