'use strict'

var _indexOf = require('lodash.indexof');
// const RH = require('../response');
const utility = require('./utility');
// const JWT = require('./jwt');
const hasura = require('./hasura');
// const SQS = require('./sqs');
const MSG = require('../messages');

/**
 * rideCancel
 * 
 * @class ride
 */
var rideCancel = (function () {

  /**
   * ride status
   */
  const RIDE_STATUS = {
    NEW: "NEW",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETE: "COMPLETE",
    CANCELED: "CANCELED"
  };

  /**
   * Initialized a new instance of @rideCancel class.
   */
  function rideCancel() {};

  /**
   * Creates a new @rideCancel instance.
   */
  rideCancel.bootstrap = function () {
    return new rideCancel();
  };

  /**
   * handle ride complete action
   * 
   * @param {String} id
   * 
   * @returns JSON
   */
  rideCancel.prototype.execute = async function (request) {

   
    let {
      body,
      headers
    } = request;
 
    try {

      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      // check valid roles
      if (!['driver', 'rider'].includes(currentUserRole)) {
        throw new Error(MSG.ERRORS.not_authorized_to_cancel_ride);
      }


      //  get primary records
      let primaryRecords = await hasura.getRideRecord(body.input.ride_id);
      // console.log('primaryRecords : ', primaryRecords);


      // driver session related check points
      if (currentUserRole == 'driver') {
        // check 1 : is ride assigned to driver?
        if (primaryRecords.ride.driver_user_id != currentUserId) {
          throw new Error(MSG.ERRORS.ride_is_not_assigned_to_driver);
        }

        // check 2 : driver account active status
        if (primaryRecords.ride.driver.active !== true) {
          throw new Error(MSG.ERRORS.driver_is_not_active_you_cannot_cancel_ride);
        }

        // check 3 : driver account block status
        if (primaryRecords.ride.driver.block === true) {
          throw new Error(MSG.ERRORS.driver_is_blocked_you_cannot_cancel_ride);
        }
      }

      if (currentUserRole == 'rider') {
        // check : is ride assigned to rider?
        if (primaryRecords.ride.user_id != currentUserId) {
          throw new Error(MSG.ERRORS.not_authorized_to_cancel_ride);
        }
      }

      // check 2 : check ride status
      if (!(primaryRecords.ride.status == RIDE_STATUS.NEW ||
          primaryRecords.ride.status == RIDE_STATUS.ASSIGNED ||
          primaryRecords.ride.status == RIDE_STATUS.IN_PROGRESS)) {
        throw new Error(MSG.ERRORS.ride_is_not_valid_to_cancel);
      }

      let updateRes = await hasura.cancelRide(
        primaryRecords.ride.id,
        currentUserId,
        currentUserRole,
        body.input.cancellation_reason
      );

      console.log('primaryRecords : ', primaryRecords);

      if (primaryRecords.ride.vehicle_id) {
        let locationStart = primaryRecords.ride.start_location.replace(")", '');
        locationStart = locationStart.replace("(", '').trim();
        locationStart = locationStart.split(",")
        let cabNumber = await hasura.getCabNumberFromVehicleId(primaryRecords.ride.vehicle_id);
        let makeReq = {
          cab_number: cabNumber.cab_number,
          ride_id: primaryRecords.ride.id,
          lat: locationStart[1],
          lon: locationStart[0]
        }
        utility.snedRideInThirdParty('delete', makeReq)
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: updateRes.ride.id,
          user_id: updateRes.ride.user_id,
          status: updateRes.ride.status,
          cancelled_by_user_id: updateRes.ride.cancelled_by_user_id,
          cancellation_reason: updateRes.ride.cancellation_reason,
          cancelled_at: updateRes.ride.cancelled_at
        })
      };

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



  return rideCancel;
}());

module.exports = rideCancel.bootstrap();