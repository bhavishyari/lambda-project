const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const notiMsg = require("../handlers/messages");

/**
 * handle notifications for RIDE_REQUEST_UPDATE event
 * event source: ride_request update
 * TARGET USER: rider
 * SES TEMPLATE: RIDE_REQUEST_ACCEPTED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const RIDE_REQUEST_UPDATE = async (trigger, event) => {

  let Template = null,
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new,
    pushMsg = {title: null, body: null};

  if (evt.is_accepted) {
    // Ride has been accepted
    Template = 'RIDE_REQUEST_ACCEPTED';
  } else if (evt.is_rejected) {
    // Ride has been rejected
    // Template = 'RIDE_REQUEST_REJECTED'; // no need to implement
  }

  if (Template === null) {
    return false;
  }


  let ride_request = await hasura.FetchRideRequest(evt.id);

  let user_setting = await hasura.FetchUserSetting(ride_request.rider.id);
  console.log(user_setting,'user_setting');

  // add email notifications..
  if (user_setting['email']) {

  if (ride_request.rider.email) {
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [ride_request.rider.email],
        TemplateData: {
            firstname: utility.GetFirstnameFromFullName(ride_request.rider.full_name),
            driver_name: ride_request.driver.full_name,
            driver_phone: ride_request.driver.country_code + ride_request.driver.mobile,
            start_address: ride_request.ride.start_address,
            end_address: ride_request.ride.end_address,
            start_location: ride_request.ride.start_location,
            end_location: ride_request.ride.end_location,
            ride_distance: ride_request.ride.distance,
            eta_number: ride_request.ride.eta_number,
            eta_unit: ride_request.ride.eta_unit
        }
      }
    ];
  }
}

  
  let flagWebpush = utility.IsSubscribedForPush(ride_request.rider, 'webpush');

  let pushData = {
    ride_request_id: ride_request.id,
    ride_id: ride_request.ride.id,
    rider_name: ride_request.rider.full_name,
    driver_name: ride_request.driver.full_name,
    driver_country_code: ride_request.driver.country_code,
    driver_mobile: ride_request.driver.mobile,
    start_address: ride_request.ride.start_address,
    end_address: ride_request.ride.end_address,
    start_location: ride_request.ride.start_location,
    end_location: ride_request.ride.end_location,
    ride_distance: ride_request.ride.distance,
    eta_number: (ride_request.ride.eta_number) ? ride_request.ride.eta_number : '15',
    eta_unit: (ride_request.ride.eta_unit) ? ride_request.ride.eta_unit : "minutes",
    notification_type: Template
  };


  if (evt.is_accepted) {
    pushMsg = {
      title: 'Ride accepted',
      // body: `Your ride has been accepted by driver ${pushData.driver_name}. He/she will arrive within ${pushData.eta_number} ${pushData.eta_unit} at your location. Have a safe and happy journey.`
      // body: utility.getNotificationContent(notiMsg.NOTIFICATION.ride_booked)
      body: utility.getNotificationContent(notiMsg.NOTIFICATION.ride_booked, {
        "<driver_name>": ride_request.driver.full_name,
        "<car_number>": ride_request.vehicle.registration_number,
        "<driver_contact_number>": ride_request.driver.country_code + ride_request.driver.mobile
      })

    };
  } else if (evt.is_rejected) {
    // no need to send for now..
  }

  
  // add push notifications
  if (user_setting['push']) {

  if (flagWebpush) {

    notificationList['push'] = [
      {
        userId: ride_request.rider.id,
        platform: 'webpush',
        notification: pushMsg,
        data: pushData
      }
    ];
  }
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
    user_id: ride_request.rider.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---

  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('RIDE_REQUEST_UPDATE : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = RIDE_REQUEST_UPDATE;
