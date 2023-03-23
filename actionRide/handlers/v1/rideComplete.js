'use strict'


const SQS = require('./sqs');
const hasura = require('./hasura');
const MSG = require('../messages');

/**
 * rideComplete
 * 
 * @class ride
 */
var rideComplete = (function () {

  /**
   * ride status
   */
  const RIDE_STATUS = {
    NEW: "NEW",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETE: "COMPLETE",
    CANCELED: "CANCELED",
  };

  /**
   * Initialized a new instance of @rideComplete class.
   */
  function rideComplete() { };

  /**
   * Creates a new @rideComplete instance.
   */
  rideComplete.bootstrap = function () {
    return new rideComplete();
  };

  /**
   * handle ride complete action
   * 
   * @param {String} id
   * 
   * @returns JSON
   */
  rideComplete.prototype.execute = async function (request) {


    let { body, headers } = request;
   
    try {


      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];


      if ( !['driver'].includes(currentUserRole) )  {
        throw new Error(MSG.ERRORS.not_authorized_to_complete_ride);
      }



      //  get primary records
      let primaryRecords = await hasura.getRideRecord(body.input.ride_id);
      // console.log('primaryRecords : ', primaryRecords);


      // check 1 : is ride assigned to driver?
      if (primaryRecords.ride.driver_user_id != currentUserId) {
        throw new Error(MSG.ERRORS.ride_is_not_assigned_to_driver);
      }

      // check 2 : check ride status
      if (primaryRecords.ride.status != RIDE_STATUS.IN_PROGRESS) {
        throw new Error(MSG.ERRORS.ride_is_not_valid_to_complete);
      }

      // check 3 : driver account active status
      if (primaryRecords.ride.driver.active !== true) {
        throw new Error(MSG.ERRORS.driver_is_not_active_you_cannot_complete_ride);
      }

      // check 4 : driver account block status
      if (primaryRecords.ride.driver.block === true) {
        throw new Error(MSG.ERRORS.driver_is_blocked_you_cannot_complete_ride);
      }


      let updateRes = await hasura.completeRide(
        primaryRecords.ride.id, 
        (body.input.route_map_file_id) ? body.input.route_map_file_id : null, 
        primaryRecords.ride.start_at);

      // add rating notification to queue
      await SQS.sendRatingNotification({
        ride_id: primaryRecords.ride.id,
        user_id: primaryRecords.ride.user_id,
        driver_user_id: primaryRecords.ride.driver_user_id
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: updateRes.ride.id,
          user_id: updateRes.ride.user_id,
          boarding_pass_id: updateRes.ride.boarding_pass_id,
          distance: updateRes.ride.distance,
          status: updateRes.ride.status,
          route_map_file_id: updateRes.ride.route_map_file_id
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


  return rideComplete;
}());

module.exports = rideComplete.bootstrap();
