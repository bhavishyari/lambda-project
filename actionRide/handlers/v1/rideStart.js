'use strict'

const hasura = require('./hasura');
const SQS = require('./sqs')
const MSG = require('../messages');

/**
 * rideStart
 * 
 * @class ride
 */
var rideStart = (function () {

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
   * Initialized a new instance of @rideStart class.
   */
  function rideStart() { };

  /**
   * Creates a new @rideStart instance.
   */
  rideStart.bootstrap = function () {
    return new rideStart();
  };

  /**
   * handle ride complete action
   * 
   * @param {String} id
   * 
   * @returns JSON
   */
  rideStart.prototype.execute = async function (request) {

   

    let { body, headers } = request;
   
    try {


      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      // role check
      if ( !['driver'].includes(currentUserRole)) {
        throw new Error(MSG.ERRORS.not_authorized_to_start_ride);
      }

      //  get primary records
      let primaryRecords = await hasura.getRecordsForRideStart(body.input.ride_id);
      // console.log('primaryRecords : ', primaryRecords);


      // check 1 : is ride assigned to driver?
      if (primaryRecords.ride.driver_user_id !== currentUserId) {
        throw new Error(MSG.ERRORS.ride_is_not_assigned_to_driver);
      }

      // check 2 : check ride status
      if (primaryRecords.ride.status !== RIDE_STATUS.ASSIGNED) {
        throw new Error(MSG.ERRORS.ride_is_not_valid_to_start);
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

      // check 6 : verify QR code values
      if (primaryRecords.ride.confirmation_code !== body.input.confirmation_code) {
        throw new Error(MSG.ERRORS.confirmation_code_not_valid);
      }

      // TODO: check 7 : is boarding pass valid? NEED TO CONFIRM FIRST


      let updateRes = await hasura.startRide(primaryRecords.ride.id);


      
      // prepare notifications
      let sqsNotifications = [];

      let pushMsg = {
        title: "Ride code verified",
        body: "Your ride code is verified."
      };

      // send push to android & web
      sqsNotifications.push( prepareNotificationPush(primaryRecords, "webpush", pushMsg) );

      // add in app notification
      let inAppNotifications = [{
        content: {
          title: pushMsg.title,
          message: pushMsg.body,
          data: {
            rideId: primaryRecords.ride.id,
            confirmationCode: primaryRecords.ride.confirmation_code
          }
        },
        priority: "HIGH",
        sender_user_id: null,   // system generated
        target: "USER",
        user_id: primaryRecords.ride.user.id // target user
      }];

      sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));

      // trigger all notification by sending sqs messages.
      await Promise.all(sqsNotifications);


      return {
        statusCode: 200,
        body: JSON.stringify({
          id: updateRes.ride.id,
          user_id: updateRes.ride.user_id,
          driver_user_id: updateRes.ride.driver_user_id,
          boarding_pass_id: updateRes.ride.boarding_pass_id,
          distance: updateRes.ride.distance,
          status: updateRes.ride.status
        })
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
   * prepare push notification
   * 
   * @param {Object} primaryRecords 
   * @param {String} platform 
   * @param {Object} pushMsg
   * 
   * @returns {Promise}
   */
  var prepareNotificationPush = function(primaryRecords, platform, pushMsg) {

    console.log(primaryRecords,'primaryRecords')
    let data = {
      "rideId": primaryRecords.ride.id,
      "confirmationCode": primaryRecords.ride.confirmation_code
    };

    let push = {
      "UserId": primaryRecords.ride.user.id,
      "userId": primaryRecords.ride.user.id,
      "platform": platform,
      "notification": pushMsg,
      "data": data
    };

    return SQS.sendPush(push);
  }

  return rideStart;
}());

module.exports = rideStart.bootstrap();
