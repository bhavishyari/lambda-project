'use strict'

const sqs = require('./../common/sqs');
const utility = require('./../common/utility');
const hasura = require('./../common/hasura');

/**
 * processor
 * 
 * @class processor
 */
var processor = (function () {

  /**
   * Initialized a new instance of @processor class.
   */
  function processor() { };

  /**
   * Creates a new @processor instance.
   */
  processor.bootstrap = function () {
    return new processor();
  };

  /**
   * process sqs message
   * 
   * @param {String} qMessage
   */
  processor.prototype.execute = async function (qMessage) {

    

    const msgBody = JSON.parse(qMessage.body);

    // console.log('sqsHandler : NotificationRating : msgBody ', msgBody);
    /**
     * sqsHandler : NotificationRating : msgBody  
     * {
     *    "ride_id": "234c697e-7222-4258-ad20-28148a066051", 
     *    "user_id": "b59a1653-76e1-4729-9b37-85bee66d8883", 
     *    "driver_user_id": "1fb38aa9-32a5-4346-b28b-2d22729cb225" 
     * }
     */

    if(!msgBody.ride_id) {
      console.log('ride_id is missing in SQS message');
      return false;
    }

    if(!msgBody.user_id) {
      console.log('user_id is missing in SQS message');
      return false;
    }
    
    if(!msgBody.driver_user_id) {
      console.log('driver_user_id is missing in SQS message');
      return false;
    }

    let {
      ride, 
      rating_by_rider, 
      rating_by_driver
    } = await hasura.getRideRecordAndRatingsCount(
      msgBody.ride_id, 
      msgBody.user_id, 
      msgBody.driver_user_id);

    let pushData = {
      ride : {
        id: ride.id,
        user_id: ride.user_id,
        driver_user_id: ride.driver_user_id
      },
      notification_type: 'NOTIFICATION_RATING_SUBMIT'
    };
    
    let pushMsgRider = {
      "title": "Provide your review",
      "body": `Hi ${utility.getFirstnameFromFullName(ride.user.full_name)}, we hope you've enjoyed the last ride! Please consider taking a minute to provide a review to ${utility.getFirstnameFromFullName(ride.driver.full_name)}.`
    };
  
    let pushMsgDriver = {
      "title": "Provide your review",
      "body": `Hi ${utility.getFirstnameFromFullName(ride.user.full_name)}, we hope you've enjoyed the last ride! Please consider taking a minute to provide a review to ${utility.getFirstnameFromFullName(ride.driver.full_name)}.`
    };
  

    let sqsNotifications = [];
    let inAppNotifications = [];
    if (rating_by_rider === 0) {

      // add push notification
      sqsNotifications.push(prepareNotificationPush(ride.user_id, 'webpush', pushMsgRider, pushData));

      // add in app notification
      inAppNotifications.push({
        content: {
          title: pushMsgRider.title,
          message: pushMsgRider.body,
          data: pushData
        },
        priority: "HIGH",
        sender_user_id: null,   // system generated
        target: "USER",
        user_id: ride.user_id   // target user
      });

    }

    if (rating_by_driver === 0) {

      // add push notification
      sqsNotifications.push(prepareNotificationPush(ride.driver_user_id, 'android', pushMsgDriver, pushData));

      // add in app notification
      inAppNotifications.push({
        content: {
          title: pushMsgDriver.title,
          message: pushMsgDriver.body,
          data: pushData
        },
        priority: "HIGH",
        sender_user_id: null,   // system generated
        target: "USER",
        user_id: ride.user_id   // target user
      });
    }


    // ---
    sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));

    // send notifications
    let res = await Promise.all(sqsNotifications);
    console.log( 'NotificationRating : Notification sent : ', JSON.stringify(res) );

  };



  /**
   * prepare push notification for rider
   * 
   * @param {String} userId       the id of target user
   * @param {Object} ride         the ride object with rider and driver details
   * @param {String} platform     the platform
   * @param {Object} pushData     the push data
   * @param {Object} pushMsg      the user type
   * 
   * @returns {Promise}
   */
  var prepareNotificationPush = function(userId, platform, pushMsg, pushData) {

    let push = {
      "userId": userId,
      "platform": platform,
      "notification": pushMsg,
      "data": pushData
    };
    
    return sqs.sendPush(push);
  }

  return processor;
}());

module.exports = processor.bootstrap();
