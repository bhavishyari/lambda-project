const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

/**
 * handle notifications for BOARDING_PASS_UPGRADED event
 * event source: boarding_pass update
 * TARGET USER: rider
 * SES TEMPLATE: BOARDING_PASS_UPGRADED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const BOARDING_PASS_UPGRADED = async (trigger, event) => {

  let Template = 'BOARDING_PASS_UPGRADED',
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new
    pushMsg = {title: null, body: null};


  let user = await hasura.FetchUser(evt.user_id);
  let plan = await hasura.FetchPlan(evt.plan_id);
  if (!user) {
    console.log('user not found');
    return false;
  }

  if (!plan) {
    console.log('plan not found');
    return false;
  }

  let passNoPadZero = utility.FormatPassNo(evt.pass_number);
  let qrUrl = utility.BoardingPassQR(passNoPadZero, evt.qr_code);
  let validFrom = utility.FormatDatetime(evt.valid_from);
  let validTo = utility.FormatDatetime(evt.valid_to);

  if (user && user.email) {
    // add email notifications..
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [user.email],
        TemplateData: {
            firstname: utility.GetFirstnameFromFullName(user.full_name),
            pass_number: passNoPadZero,
            valid_from: validFrom,
            valid_to: validTo,
            pass_type: evt.pass_type,
            pass_status: evt.status,
            qr_code_url: qrUrl,
            new_plan_name: plan.title
        }
      }
    ];
  }

  // // add sms notifications..
  // notificationList['sms'] = [
  // ];

  pushMsg = {
    title: 'Your boarding pass upgraded',
    body: `Your boarding pass ${passNoPadZero} started  on ${validFrom} has  been upgraded.`
  };

  let pushData = {
    user:{
      id: user.id,
      full_name: user.full_name,
    },
    boarding_pass:{
      id: evt.id,
      pass_number: passNoPadZero,
      valid_from: evt.valid_from,
      valid_to: evt.valid_to,
      pass_type: evt.pass_type,
      pass_status: evt.status,
      qr_code_url: qrUrl,
      new_plan_name: plan.title
    },
    notification_type: Template
  };

  let flagWebpush = utility.IsSubscribedForPush(user, 'webpush');

  // add push notifications
  if (flagWebpush) {

    notificationList['push'] = [
      {
        userId: user.id,
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
    sender_user_id: null,   // system generated
    target: "USER",
    user_id: user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---  

  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('BOARDING_PASS_UPGRADED : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = BOARDING_PASS_UPGRADED;
