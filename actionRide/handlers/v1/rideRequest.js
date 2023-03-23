'use strict'

const _find = require('lodash.find');
// const RH = require('./../response');
// const JWT = require('./jwt');
const hasura = require('./hasura');
const utility = require('./utility');
const MSG = require('../messages');

/**
 * rideRequest
 * 
 * @class rideRequest
 */
var rideRequest = (function () {

  /**
   * Initialized a new instance of @rideRequest class.
   */
  function rideRequest() {};

  /**
   * Creates a new @rideRequest instance.
   */
  rideRequest.bootstrap = function () {
    return new rideRequest();
  };

  /**
   * accept ride
   * 
   * @param {Object} request
   * 
   * @returns JSON
   */
  rideRequest.prototype.accept = async function (request) {

    /*
    // dev -  https://qj019ts4jj.execute-api.us-west-2.amazonaws.com/latest/v1/ride-request/accept 
    */

    let {
      body,
      headers
    } = request;
    // let authHeader = headers.Authorization;
    // console.log('body : ', body);
    // console.log('headers : ', headers);

    try {

      // decode & verify jwt token
      //const decodedToken = await JWT.verifyIdToken(authHeader);


      //let currentUserId = decodedToken['https://hasura.io/jwt/claims']['x-hasura-user-id'];

      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      if (!['driver'].includes(currentUserRole)) {
        throw new Error('You are not authorized to accept this ride request.');
      }

      //  get primary records
      let primaryRecords = await hasura.getRideAndRequestRecords(body.input.ride_request.ride_id);

      // get ride request record by id
      let rideRequest = _find(primaryRecords.ride_requests, {
        'id': body.input.ride_request.id
      });

      // check 1 : is ride request record found?
      if (!rideRequest) {
        throw new Error(MSG.ERRORS.ride_request_is_not_found);
      }

      // check 2 : is current user authorized to access ride request record?
      if (rideRequest.driver_user_id !== currentUserId) {
        // console.log('currentUserId : ', currentUserId);
        throw new Error(MSG.ERRORS.not_authorized_to_accept_ride);
      }

      // check 3 : is ride request already accepted?
      if (rideRequest.is_accepted === true) {
        throw new Error(MSG.ERRORS.ride_request_already_accepted);
      }

      // check 4 : is ride_request accepted by other driver?
      let rideRequestAccepted = _find(primaryRecords.ride_requests, {
        'is_accepted': true
      });
      if (rideRequestAccepted) {
        throw new Error(MSG.ERRORS.ride_request_already_accepted_by_other_driver);
      }

      // check 5 : is driver assigned to ride record?
      if (primaryRecords.ride.driver_user_id) {
        throw new Error(MSG.ERRORS.driver_already_assigned_to_ride);
      }

      // check 6 : is ride status valid?
      if (primaryRecords.ride.status != 'NEW') {
        throw new Error(MSG.ERRORS.ride_status_not_valid_to_accept);
      }


      
      let updatedRideRequest = await hasura.acceptRideRequest(
        rideRequest.ride_id,
        rideRequest.id,
        rideRequest.driver_user_id,
        body.input.ride_request.eta_number,
        body.input.ride_request.eta_unit,
        rideRequest.vehicle_id
      );

      if (rideRequest.vehicle_id) {
        let locationStart = primaryRecords.ride.start_location.replace(")", '');
        locationStart = locationStart.replace("(", '').trim();
        locationStart = locationStart.split(",")
        let cabNumber = await hasura.getCabNumberFromVehicleId(rideRequest.vehicle_id);
        let makeReq = {
          cab_number: cabNumber.cab_number,
          ride_id: rideRequest.ride_id,
          lat: locationStart[1],
          lon: locationStart[0]
        }
        
        utility.snedRideInThirdParty('post', makeReq)
      }
      return {
        statusCode: 200,
        body: JSON.stringify(updatedRideRequest)
      }

    } catch (err) {
      // console.log('err : ', err);
      // return RH.error400(err.message);

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: err.message
        })
      };

    }

  };

  /**
   * reject ride
   * 
   * @param {Object} request
   * 
   * @returns JSON
   */
  rideRequest.prototype.reject = async function (request) {

   
    let {
      body,
      headers
    } = request;
   
    try {

      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      if (!['driver'].includes(currentUserRole)) {
        throw new Error('You are not authorized to reject this ride request.');
      }

      //  get primary records
      let primaryRecords = await hasura.getRideAndRequestRecords(body.input.ride_request.ride_id);

      // get ride request record by id
      let rideRequest = _find(primaryRecords.ride_requests, {
        'id': body.input.ride_request.id
      });

      // check 1 : is ride request record found?
      if (!rideRequest) {
        throw new Error(MSG.ERRORS.ride_request_is_not_found);
      }

      // check 2 : is current user authorized to access ride request record?
      if (rideRequest.driver_user_id !== currentUserId) {
        // console.log('currentUserId : ', currentUserId);
        throw new Error(MSG.ERRORS.not_authorized_to_reject_ride);
      }

      // check 3 : is ride request already rejected?
      if (rideRequest.is_rejected === true) {
        throw new Error(MSG.ERRORS.ride_request_already_rejected);
      }

      // check 4 : is ride status valid?
      if (primaryRecords.ride.status != 'NEW') {
        throw new Error(MSG.ERRORS.ride_status_not_valid_to_reject);
      }

      let updateRes = await hasura.rejectRideRequest(rideRequest.id,currentUserId);

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: updateRes.id,
          is_rejected: updateRes.is_rejected,
          rejected_at: updateRes.rejected_at
        })
      };

    } catch (err) {
    
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: err.message
        })
      };

    }

  };

  return rideRequest;
}());

module.exports = rideRequest.bootstrap();