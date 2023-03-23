const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

/**
 * handle notifications for VEHICLE_ARRIVED event
 * 
 * event source: ride update
 * TARGET USER: rider
 * SES TEMPLATE: ???
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const VEHICLE_ARRIVED = async (trigger, event) => {

  let Template = 'VEHICLE_ARRIVED',
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new, pushMsg = {title: null, body: null},
    vehicleNumber = '-', vehicleMakeModel = '';



  let ride = await hasura.FetchRideDetails(evt.id);
  if (ride.vehicle) {
    vehicleNumber = ride.vehicle.registration_number;
    vehicleMakeModel = utility.FormatVehicleMakeModel(ride.vehicle);
  }

  if (evt.status === 'ASSIGNED' && evt.vehicle_arrived_at) {
    
    pushMsg = {
      title: "Driver arrived",
      body: `Your driver with vehicle number ${vehicleNumber} has been arrived on the pickup location and waiting for you.`
    }

  }



  // // add sms notifications..
  // notificationList['sms'] = [
  //   {
  //     "UserId": ride.user.id,
  //     "Message": `Your ride is completed.`,
  //     "PhoneNumber": `${ride.user.country_code}${ride.user.mobile}`
  //   }
  // ];

  let pushData = {
    user:{
      id: ride.user.id,
      full_name: ride.user.full_name,
    },
    ride:{
      id: evt.id,
      start_address: evt.start_address,
      end_address: evt.end_address,
      driver_name: utility.GetFirstnameFromFullName(ride.driver.full_name),
      vehicle_make_model: vehicleMakeModel,
      vehicle_number: vehicleNumber
    },
    notification_type: Template
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
    sender_user_id: ride.driver.id,   // system generated
    target: "USER",
    user_id: ride.user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('VEHICLE_ARRIVED : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = VEHICLE_ARRIVED;
