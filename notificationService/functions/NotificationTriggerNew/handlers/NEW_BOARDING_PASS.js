const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const notiMsg = require("../handlers/messages");

/**
 * handle notifications for NEW_BOARDING_PASS event
 * event source: boarding_pass create
 * TARGET USER: rider
 * SES TEMPLATE: NEW_BOARDING_PASS
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_BOARDING_PASS = async (trigger, event) => {

  let Template = 'NEW_BOARDING_PASS',
    notificationList = {
      emails: [],
      sms: [],
      push: []
    },
    evt = event.data.new;


  let user = await hasura.FetchUser(evt.user_id);
  let plan = await hasura.FetchPlan(evt.plan_id);
  let user_setting = await hasura.FetchUserSetting(evt.user_id);
  console.log(user_setting, 'user_setting');
  // console.log(user_setting.params[0]['email'],'user_setting_email');

  if (!user) {
    console.log('user not found');
    return false;
  }

  let passNoPadZero = utility.FormatPassNo(evt.pass_number);
  let qrUrl = utility.BoardingPassQR(passNoPadZero, evt.qr_code);
  let validFrom = utility.FormatDatetime(evt.valid_from);
  let validTo = utility.FormatDatetime(evt.valid_to);


  let number_of_rides = plan.total_trips;
  if (plan.unlimited_trips) {
    number_of_rides = "unlimited"
  }

  if (plan.unlimited_trips==true || plan.total_trips==9999) {
    number_of_rides = "unlimited"
  }


  if (user_setting['email']) {
    if (user && user.email) {
      // add email notifications..
      notificationList['emails'] = [{
        Template,
        ToAddresses: [user.email],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(user.full_name),
          textMsg: utility.getNotificationContent(notiMsg.NOTIFICATION.pass_purchased, {
            "<pass_name>": plan.title,
            "<number_of_rides>": number_of_rides,
            "<time>": plan.validity_days,
          }),
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

  // // add sms notifications..
  // notificationList['sms'] = [
  // ];


  let pushMsg = {
    title: 'Pass purchased',
    // body: `Your boarding pass generated, Pass #:${passNoPadZero}`
    body: utility.getNotificationContent(notiMsg.NOTIFICATION.pass_purchased, {
      "<pass_name>": plan.title,
      "<number_of_rides>": number_of_rides,
      "<time>": plan.validity_days,
    })

  };

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

  // add push notifications
  if (user_setting['push']) {

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
  console.log('NEW_BOARDING_PASS : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_BOARDING_PASS;