const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const notiMsg = require("../handlers/messages");


/**
 * handle notifications for NEW_RIDE_REQUEST event
 * event source: ride_request create
 * TARGET USER: driver
 * SES TEMPLATE: NEW_RIDE_REQUEST
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_RIDE_REQUEST = async (trigger, event) => {

  let Template = trigger,
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new,
    pushMsg = {title: null, body: null};

  let ride_request = await hasura.FetchRideRequest(evt.id);

  // return if driver is not available
  if (!ride_request.driver) {
    return false;
  }

  // return if rider is not available
  if (!ride_request.rider) {
    return false;
  }


  let sAdr = utility.FormatAddress(ride_request.ride.start_address);
  let eAdr = utility.FormatAddress(ride_request.ride.end_address);

  // add email notifications..
  if (ride_request.driver.email) {
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [ride_request.driver.email],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(ride_request.driver.full_name),
          rider_name: ride_request.rider.full_name,
          rider_mobile: ride_request.rider.country_code + ride_request.rider.mobile,
          start_address: sAdr,
          end_address: eAdr,
          ride_distance: ride_request.ride.distance,

          start_location: ride_request.ride.start_location,
          end_location: ride_request.ride.end_location
        }
      }
    ];
  }

  //add sms notifications..
  // notificationList['sms'] = [
  //   {
  //     UserId: ride_request.driver.id,
  //     Message: 'You have new ride request.',
  //     PhoneNumber: `${ride_request.rider.country_code}${ride_request.rider.mobile}`
  //   }
  // ];

  let flagAndroidPush = utility.IsSubscribedForPush(ride_request.driver, 'android');

  // add push notifications
  let pushData = {
    ride_request_id: ride_request.id,
    ride_id: ride_request.ride.id,
    driver_name: ride_request.driver.full_name,
    rider_name: ride_request.rider.full_name,
    rider_country_code: ride_request.rider.country_code,
    rider_mobile: ride_request.rider.mobile,
    start_address: ride_request.ride.start_address,
    end_address: ride_request.ride.end_address,
    start_location: ride_request.ride.start_location,
    end_location: ride_request.ride.end_location,
    ride_distance: ride_request.ride.distance,
    notification_type: Template
  };

  pushMsg = {
    title: 'Ride request',
    body: 'You have new ride request.'

  };

  console.log(pushMsg,'pushMsg');


  if (flagAndroidPush) {
    notificationList['push'] = [
      {
        userId: ride_request.driver.id,
        platform: 'android',
        notification: pushMsg,
        data: pushData
      }
      // ,
      // {
      //   userId: ride_request.driver.id,
      //   platform: 'webpush',
      //   notification: {
      //     title: 'Ride request',
      //     body: 'You have new ride request.'
      //   },
      //   data: pushData
      // }
    ];
  }




  let sqsNotifications = [];
  for (let i = 0; i < notificationList.emails.length; i++) {
    if (notificationList.emails[i].ToAddresses.length) {
      sqsNotifications.push(sqs.CreateEmailNotification(notificationList.emails[i]));
    }
  }

  for (let i = 0; i < notificationList.sms.length; i++) {
    if (notificationList.sms[i].PhoneNumber) {
      sqsNotifications.push(sqs.CreateSmsNotification(notificationList.sms[i]));
    }
  }

  for (let i = 0; i < notificationList.push.length; i++) {
    if (notificationList.push[i].userId) {
      sqsNotifications.push(sqs.CreatePushNotification(notificationList.push[i]));
    }
  }


  // add in app notification
  let inAppNotifications = [{
    content: {
      title: pushMsg.title,
      message: pushMsg.body,
      data: pushData
    },
    priority: "HIGH",
    sender_user_id: null,   // system generated
    target: "USER",
    user_id: ride_request.driver.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  // console.log('sqsResult : ', sqsResult);
  console.log('NEW_RIDE_REQUEST : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_RIDE_REQUEST;
