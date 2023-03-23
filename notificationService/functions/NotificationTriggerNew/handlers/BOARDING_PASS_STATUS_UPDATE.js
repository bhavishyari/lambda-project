const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const moment = require('moment');
const notiMsg = require("../handlers/messages");

/**
 * handle notifications for BOARDING_PASS_STATUS_UPDATE event
 * event source: boarding_pass update
 * TARGET USER: rider
 * SES TEMPLATE: BOARDING_PASS_EXPIRED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const BOARDING_PASS_STATUS_UPDATE = async (trigger, event) => {

  let Template = null,
    notificationList = {
      emails: [],
      sms: [],
      push: []
    },
    evt = event.data.new,
    pushMsg = {
      title: null,
      body: null
    };


  if (evt.status === 'EXPIRED') {
    // boarding pass status changed to EXPIRED
    Template = 'BOARDING_PASS_EXPIRED';
  }

  if (Template === null) {
    return false;
  }

  let user = await hasura.FetchUser(evt.user_id);


  let user_setting = await hasura.FetchUserSetting(evt.user_id);
  console.log(user_setting, 'user_setting');

  let passNoPadZero = utility.FormatPassNo(evt.pass_number);
  let qrUrl = utility.BoardingPassQR(passNoPadZero, evt.qr_code);
  let validFrom = utility.FormatDatetime(evt.valid_from);
  let validTo = utility.FormatDatetime(evt.valid_to);

  if (user_setting['email']) {

    if (evt.status === 'EXPIRED') {
      if (user && user.email) {
        // add email notifications..
        notificationList['emails'] = [{
          Template,
          ToAddresses: [user.email],
          // ToAddresses: ['rajesh@solulab.co'],
          TemplateData: {
            firstname: utility.GetFirstnameFromFullName(user.full_name),
            pass_number: passNoPadZero,
            valid_from: validFrom,
            valid_to: validTo,
            pass_type: evt.pass_type,
            pass_status: evt.status,
            qr_code_url: qrUrl
          }
        }];
      }
    }
  }

  // // add sms notifications..
  // if (evt.status === 'EXPIRED') {    
  //   const validityDays = Math.abs(moment(evt.valid_to).diff(moment(evt.valid_from), 'days'));
  //   notificationList['sms'] = [
  //     {
  //       "UserId": user.id,
  //       "Message": `We hope you enjoyed riding with yello. Your ${validityDays} day ride pass has expired. If you would like to continue riding with yello feel free to purchase a new pass from the app.`,
  //       "PhoneNumber": `${user.country_code}${user.mobile}`
  //     }
  //   ];
  // }
//passNoPadZero

console.log(evt.plan.title,'evt.plan.title');

  if (evt.status === 'EXPIRED') {
    pushMsg = {
      title: 'Pass expired',
      body: utility.getNotificationContent(notiMsg.NOTIFICATION.pass_expired, {
        "<pass_name>": evt.plan.title,
      })

    };
  }

  let pushData = {
    user: {
      id: user.id,
      full_name: user.full_name,
    },
    boarding_pass: {
      id: evt.id,
      pass_number: passNoPadZero,
      valid_from: evt.valid_from,
      valid_to: evt.valid_to,
      pass_type: evt.pass_type,
      pass_status: evt.status,
      qr_code_url: qrUrl
    },
    notification_type: Template
  };

  let flagWebpush = utility.IsSubscribedForPush(user, 'webpush');
  if (user_setting['push']) {

    // add push notifications
    if (flagWebpush) {

      notificationList['push'] = [{
        userId: user.id,
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
    user_id: user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('BOARDING_PASS_STATUS_UPDATE : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = BOARDING_PASS_STATUS_UPDATE;