'use strict'

const hasura = require('./hasura');
const SQS = require('./sqs')
const MSG = require('../messages');

/**
 * vehicleArrived
 * 
 * @class ride
 */
var vehicleArrived = (function () {

  /**
   * ride status
   */
  const RIDE_STATUS = {
    ASSIGNED: "ASSIGNED"
  };

  /**
   * Initialized a new instance of @vehicleArrived class.
   */
  function vehicleArrived() { };

  /**
   * Creates a new @vehicleArrived instance.
   */
  vehicleArrived.bootstrap = function () {
    return new vehicleArrived();
  };

  /**
   * handle vehicle arrived action
   * 
   * @param {String} id
   * 
   * @returns JSON
   */
  vehicleArrived.prototype.execute = async function (request) {


    let { body, headers } = request;

    try {

      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      // role check
      if ( !['driver'].includes(currentUserRole)) {
        throw new Error(MSG.ERRORS.not_authorized_to_start_ride);
      }

      //  get primary records
      let primaryRecords = await hasura.getRideRecord(body.input.ride_id);
      // console.log('primaryRecords : ', primaryRecords);


      // check 1 : is ride assigned to driver?
      if (primaryRecords.ride.driver_user_id !== currentUserId) {
        throw new Error(MSG.ERRORS.ride_is_not_assigned_to_driver);
      }

      // check 2 : check ride status
      if (primaryRecords.ride.status !== RIDE_STATUS.ASSIGNED) {
        throw new Error(MSG.ERRORS.ride_status_is_not_valid);
      }

      // check 3 : driver account active status
      if (primaryRecords.ride.driver.active !== true) {
        throw new Error(MSG.ERRORS.driver_is_not_active_you_cannot_start_ride);
      }

      // check 4 : driver account block status
      if (primaryRecords.ride.driver.block === true) {
        throw new Error(MSG.ERRORS.driver_is_blocked_you_cannot_start_ride);
      }

      // check 5 : verify vehicle id
      if (primaryRecords.ride.vehicle_id !== body.input.vehicle_id) {
        throw new Error(MSG.ERRORS.vehicle_id_invalid);
      }


      // update record
      let updateRes = await hasura.updateRideVehicleArrived(primaryRecords.ride.id);


      // send response
      return {
        statusCode: 200,
        body: JSON.stringify({
          ride_id: updateRes.ride.id,
          vehicle_arrived_at: updateRes.ride.vehicle_arrived_at,
          status: updateRes.ride.status
        })
      };

    } catch (err) {
      console.log('err : ', err);
      return {
        statusCode: 400,
        body: JSON.stringify({
            message: err.message
        })
      };

    }

  };


  return vehicleArrived;
}());

module.exports = vehicleArrived.bootstrap();
