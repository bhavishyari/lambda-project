const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

/**
 * handle notifications for NEW_RIDE event
 * event source: ride create
 * TARGET USER: rider
 * SES TEMPLATE: RideBooked
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_RIDE = async (trigger, event) => {

  let Template = 'RideBooked',
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new,
    pushMsg = {
      title: "Ride booked",
      body: "Your ride is booked."
    };

  let distanceUnit = 'km';

  let ride = await hasura.FetchRideDetails(evt.id);

  if (!ride) {
    return false;
  }

  // return if rider is not available
  if (!ride.user) {
    return false;
  }

  let passNoPadZero = utility.FormatPassNo(ride.boarding_pass.pass_number);
  let sAdr = utility.FormatAddress(ride.start_address);
  let eAdr = utility.FormatAddress(ride.end_address);

  // add email notifications..
  if (ride.user.email) {
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [ride.user.email],
        TemplateData: {
          fullName: ride.user.full_name,
          confirmationCode: ride.confirmation_code,
          passNumber: passNoPadZero,
          distance: ride.distance,
          startAddress: sAdr,
          endAddress: eAdr
        }
      }
    ];
  }

  // add sms notifications..
  if (ride.user.country_code && ride.user.mobile) {
    notificationList['sms'] = [
      {
        UserId: ride.user.id,
        Message: `Your ride is booked.\nConfirmation Code: ${ride.confirmation_code}\nPass #: ${passNoPadZero}\nDistance: ${ride.distance.toFixed(2)} ${distanceUnit}\nPickup point: ${sAdr}\nDrop point: ${eAdr}`,
        PhoneNumber: `${ride.user.country_code}${ride.user.mobile}`
      }
    ];
  }

  let pushData = {
    "ride_id": ride.id,
    "confirmation_code": ride.confirmation_code,
    "pass_number": passNoPadZero,
    "distance": ride.distance,
    "start_address": sAdr,
    "end_address": eAdr,
    "notification_type": Template
  };

  let flagWebpush = utility.IsSubscribedForPush(ride.user, 'webpush');

  // add push notifications
  if (flagWebpush) {

    notificationList['push'] = [
      {
        userId: ride.user.id,  
        platform: 'webpush',
        notification: pushMsg,
        data: pushData
      }
      // ,
      // {
      //   userId: ride.user.id,
      //   platform: 'android',
      //   notification: {
      //     title: "Ride booked",
      //     body: "Your ride is booked."
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
    user_id: ride.user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---

  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_RIDE : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_RIDE;
