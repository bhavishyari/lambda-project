const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const notiMsg = require("../handlers/messages");

/**
 * handle notifications for RIDE_STATUS_UPDATE event
 * event source: ride update
 * TARGET USER: rider, driver
 * SES TEMPLATE: RIDE_COMPLETE
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const RIDE_STATUS_UPDATE = async (trigger, event) => {

  let Template = null,
    notificationList = {
      emails: [],
      sms: [],
      push: []
    },
    evt = event.data.new,
    distanceUnit = "km",
    pushMsg = {
      title: null,
      body: null
    },
    vehicleNumber = '',
    vehicleMakeModel = '';

  let ride = await hasura.FetchRideDetails(evt.id);

  let cancelledBy = await hasura.FetchUser(evt.cancelled_by_user_id);

  if (evt.status === 'IN_PROGRESS') {

    // ride status changed to IN_PROGRESS
    Template = 'RIDE_STARTED';
    pushMsg = {
      title: "Ride started",
      body: "Your ride is started, Happy Journey."
    }

  } else if (evt.status === 'COMPLETE') {



    // ride status changed to COMPLETE
    Template = 'RIDE_COMPLETE';
    pushMsg = {
      title: "Ride completed",
      // body: "Your ride is completed."
      body: utility.getNotificationContent(notiMsg.NOTIFICATION.ride_finished_rate)

    }

  } else if (evt.status === 'CANCELED') {

    // ride status changed to CANCELED
    Template = 'RIDE_CANCELED';
    pushMsg = {
      title: "Ride canceled",
      // body: "Your ride is canceled."
      body: utility.getNotificationContent(notiMsg.NOTIFICATION.ride_cancelled)

    }

  } else if (evt.status === 'ASSIGNED') {
    // ride status changed to ASSIGNED
    Template = 'NO_MAIL';
    pushMsg = {
      title: "Ride accepted",
      body: utility.getNotificationContent(notiMsg.NOTIFICATION.ride_booked, {
        "<driver_name>": ride.driver.full_name,
        "<car_number>": ride.vehicle.registration_number,
        "<driver_contact_number>": ride.driver.country_code + ride.driver.mobile
      })

      // body: `Your Yello is on the way!! ${ride.driver.full_name} will chauffer you to your desired destination.  Please look out for him in a Yello with Number ${vehicleNumber}. You can also call him on ${ride.driver.country_code}${ride.driver.mobile} to get connected. Happy Riding!!`,
    }
  }


  if (Template === null) {
    return false;
  }


  if (!ride) {
    return false;
  }

  if (!ride.user) {
    return false;
  }

  if (!ride.driver) {
    return false;
  }

  let passNoPadZero = utility.FormatPassNo(ride.boarding_pass.pass_number);

  let user_setting = await hasura.FetchUserSetting(ride.user.id);
  console.log(user_setting,'user_setting');

  if (ride.vehicle) {
    vehicleNumber = ride.vehicle.registration_number;
    vehicleMakeModel = utility.FormatVehicleMakeModel(ride.vehicle);
  }

  if (user_setting['email']) {

  if (ride.user && ride.user.email && Template != 'NO_MAIL') {
    // add email notifications..
    // notificationList['emails'] = [{
    //   Template,
    //   ToAddresses: [ride.user.email],
    //   // ToAddresses: ['rajesh@solulab.co', 'rajesh.virtueinfo@gmail.com'],  // TEST only
    //   TemplateData: {
    //     firstname: utility.GetFirstnameFromFullName(ride.user.full_name),
    //     confirmation_code: ride.confirmation_code,
    //     pass_number: passNoPadZero,
    //     distance: ride.distance + " " + distanceUnit,
    //     start_address: utility.FormatAddress(evt.start_address),
    //     end_address: utility.FormatAddress(evt.end_address),

    //     cancelled_by: (ride.cancelled_by && ride.cancelled_by.full_name) ? ride.cancelled_by.full_name : "",
    //     cancel_reason: (evt.cancellation_reason) ? evt.cancellation_reason : "",

    //     driver_name: utility.GetFirstnameFromFullName(ride.driver.full_name),
    //     vehicle_make_model: vehicleMakeModel,
    //     vehicle_number: vehicleNumber
    //   }
    // }];
  }
}

  // console.log( JSON.stringify(notificationList.emails));

  // // add sms notifications..
  if (user_setting['sms']) {

  if (evt.status === 'ASSIGNED') {
    // notificationList['sms'] = [{
    //   "UserId": ride.user.id,
    //   "Message": `Your Yello is on the way!! ${ride.driver.full_name} will chauffer you to your desired destination.  Please look out for him in a Yello with Number ${vehicleNumber}. You can also call him on ${ride.driver.country_code}${ride.driver.mobile} to get connected. Happy Riding!!`,
    //   "PhoneNumber": `${ride.user.country_code}${ride.user.mobile}`
    // }];
  } else if (evt.status === 'COMPLETE') {
    // notificationList['sms'] = [{
    //   "UserId": ride.user.id,
    //   "Message": `We hope you enjoyed your time riding Yello!!! Please provide us your feedback which helps us improve our services. Hope to see you soon on a Yello!!`,
    //   "PhoneNumber": `${ride.user.country_code}${ride.user.mobile}`
    // }];
  } else if (evt.status === 'CANCELED') {
    // notificationList['sms'] = [{
    //   "UserId": ride.user.id,
    //   "Message": `Oops The driver had to cancel your ride due to some unavoidable circumstances. Please go to Yello App and book another ride and we promise to help you reach your destination shortly.`,
    //   "PhoneNumber": `${ride.user.country_code}${ride.user.mobile}`
    // }];
  }
}

  let pushData = {
    user: {
      id: ride.user.id,
      full_name: ride.user.full_name
    },
    ride: {
      id: evt.id,
      confirmation_code: ride.confirmation_code,
      pass_number: passNoPadZero,
      distance: ride.distance,
      start_address: evt.start_address,
      end_address: evt.end_address,
      driver_name: utility.GetFirstnameFromFullName(ride.driver.full_name),
      vehicle_make_model: vehicleMakeModel,
      vehicle_number: vehicleNumber
    },
    notification_type: Template
  };

  // let flagWebpush = utility.IsSubscribedForPush(ride.user, 'webpush');

  // add push notifications
  if (user_setting['push']) {

  if (cancelledBy.type == 'driver') {
    notificationList['push'] = [{
      userId: ride.user.id,
      platform: 'webpush',
      notification: pushMsg,
      data: pushData
    }];
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
    sender_user_id: null, // system generated
    target: "USER",
    user_id: ride.user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('RIDE_STATUS_UPDATE : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = RIDE_STATUS_UPDATE;