const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

/**
 * handle notifications for NEW_RATING event
 * event source: rating create
 * TARGET USER: rider, driver
 * SES TEMPLATE: NEW_RATING
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_RATING = async (trigger, event) => {

  let Template = trigger,
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new;


  let rating = await hasura.FetchRatingDetails(evt.id);

  // return if to_user is not available
  if (!rating.to_user) {
    return false;
  }


  // add email notifications..
  if (rating.to_user.email) {
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [rating.to_user.email],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(rating.to_user.full_name),
          from_user: rating.from_user.full_name,
          from_user_type: rating.from_user_type,
          ride_id: rating.ride.id,
          rating: parseFloat(rating.given_rate).toFixed(1),
          comment: (rating.comment) ? rating.comment : "No comment"
        }
      }
    ];
  }

  // console.log(notificationList['emails']);

  // add sms notifications..
  // notificationList['sms'] = [
  //   {
  //     UserId: ride_request.driver.id,
  //     Message: 'You have new ride request.',
  //     PhoneNumber: `${ride_request.rider.country_code}${ride_request.rider.mobile}`
  //   }
  // ];

  let flagAndroidPush = utility.IsSubscribedForPush(rating.to_user, 'android');
  let flagWebPush = utility.IsSubscribedForPush(rating.to_user, 'webpush');


  let platformType = null;
  if (rating.to_user.type === 'rider') {
    platformType = 'webpush';
  } else if (rating.to_user.type === 'driver') {
    platformType = 'android';
  }


  let pushMsg = {
    title: `You get ${parseFloat(rating.given_rate).toFixed(1)} rating for your ride.`,
    body: `New rating is submitted by ${rating.from_user.full_name}, please have a look and submit your rating for your ride.`
  };

  let pushData = {
    user: {
      id: rating.to_user.id
    },
    rating: {
      id: rating.id,
      given_rate: rating.given_rate,
      from_user: rating.from_user.full_name,
      from_user_type: rating.from_user_type
    },
    notification_type: Template
  };

  // add push notifications
  if (flagAndroidPush || flagWebPush) {

    notificationList['push'] = [
      {
        userId: rating.to_user.id,
        platform:   platformType,
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
    sender_user_id: null,   // system generated
    target: "USER",
    user_id: rating.to_user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_RATING : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_RATING;
