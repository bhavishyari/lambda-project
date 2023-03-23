// const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');
const notiMsg = require("../handlers/messages");
const hasura = require('./hasura');

/**
 * handle notifications for NEW_USER_SIGNUP event
 * event source: user create
 * TARGET USER: rider, driver, sales
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_USER_SIGNUP = async (trigger, event) => {

  let Template = 'NEW_USER_SIGNUP',
    notificationList = {
      emails: [],
      sms: [],
      push: []
    },
    evt = event.data.new;

  // let user = evt;


  let user = await hasura.FetchUser(evt.user_id);

  let user_setting = await hasura.FetchUserSetting(evt.user_id);
  console.log(user_setting, 'user_setting');

  //   console.log(rider,'check rider data')

  //   let user = rider;
  //   // user.id = evt.user_id;
  // console.log(user,'check user data')

  // add email notifications..
  // if (ride_request.rider.email) {


  // check user type
  if (!(user.type === 'rider' || user.type === 'driver' || user.type === 'sales')) {
    // console.log('no need to send notification');
    return false;
  }

  let instruction = '';
  if (user.type === 'rider') {
    instruction = `Use your mobile number ${user.country_code + user.mobile} and OTP verification to login to <b>Yello</b>`;
  } else if (user.type === 'driver' || user.type === 'sales') {
    instruction = `We will send another mail with password set link and login instructions.`;
  }



  // ride status changed to ASSIGNED
  pushMsg = {
    title: "Welcome",
    body: utility.getNotificationContent(notiMsg.NOTIFICATION.welcome_user, {
      "<username>": user.full_name,
      "<link>": 'https://yello-web.appstudiointernal.ca/',
    })

  }
  if (user_setting['push'] && user.type === 'rider') {
    notificationList['push'] = [{
      userId: user.id,
      platform: 'webpush',
      notification: pushMsg,
      // data: pushData
    }];
  }

  // add email notifications..
  if (user.type === 'driver') {
    // if (user_setting['email']) {

    if (user.email) {
      notificationList['emails'] = [{
        Template,
        ToAddresses: [user.email],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(user.full_name),
          user_type: user.type,
          user_mobile: user.country_code + user.mobile,
          user_email: user.email,
          instruction: instruction
        }
      }];
    }

    // }
    // if (user_setting['sms']) {
    notificationList['sms'] = [{
      "UserId": user.id,
      "Message": utility.getNotificationContent(notiMsg.NOTIFICATION.welcome_user, {
        "<username>": user.full_name,
        "<link>": 'https://yello-web.appstudiointernal.ca/',
      }),
      "PhoneNumber": `${user.country_code}${user.mobile}`
    }];
    // }
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


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_USER_SIGNUP : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_USER_SIGNUP;