'use strict'

const sqs = require('./sqs');
const utility = require('./utility');
const hasura = require('./hasura');

/**
 * processor
 * 
 * @class processor
 */
var processor = (function () {

  /**
   * Initialized a new instance of @processor class.
   */
  function processor() {};

  /**
   * Creates a new @processor instance.
   */
  processor.bootstrap = function () {
    return new processor();
  };

  /**
   * process sqs message
   * 
   * @param {String} qMessage
   */
  processor.prototype.execute = async function (qMessage) {

    const msgBody = JSON.parse(qMessage.body);

    if (msgBody.hasOwnProperty('status') && msgBody.status != "EXPIRED") {

      // update record status to EXPIRED
      console.log('Send notification to user : boarding_pass.id : ', msgBody.id);
      // console.log('msgBody', msgBody);

      let pushMsg = {
        "title": "Ride started",
        "body": "LLLLL, Your current pass is expiring very soon!! If you want to continue riding yello feel free to ask your chauffer to extend your pass during the ride."
      };

      let pushData = {
        "boarding_pass": {
          "id": msgBody.id,
          "pass_number": utility.formatPassNo(msgBody.pass_number),
          "valid_from": msgBody.valid_from,
          "valid_to": msgBody.valid_to,
          // "pass_type": msgBody.pass_type,
          "pass_type": (msgBody.plan.title) ? msgBody.plan.title : msgBody.pass_type,
          "status": msgBody.status
        }
      };

      // send notifications, email & push
      let sqsNotifications = [];

      let user_setting = await hasura.FetchUserSetting(evt.user_id);
      console.log(user_setting, 'user_setting');

      if (user_setting['email']) {

        sqsNotifications.push(prepareNotificationEmail(msgBody));
      }
      if (user_setting['push']) {


        if (msgBody.user && msgBody.user.id) {
          sqsNotifications.push(prepareNotificationPush(msgBody, 'webpush', pushMsg, pushData));
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
          user_id: msgBody.user.id // target user
        }];
        sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
      }
      // ---

      let res = await Promise.all(sqsNotifications);

      console.log('Notification sent : ', JSON.stringify(res));

    } else {

      console.log('status is missing in msgBody.');
    }
  };


  /**
   * prepare email notification
   * 
   * @param {Object} boardingPass 
   */
  var prepareNotificationEmail = function (boardingPass) {

    let passNoPadZero = utility.formatPassNo(boardingPass.pass_number);
    let qr_url = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl={pass_number:${passNoPadZero},qr_code:${boardingPass.qr_code}}&choe=UTF-8`;

    // collect to email addresses.
    var toEmails = [];
    if (boardingPass.user && boardingPass.user.email) {
      toEmails.push(boardingPass.user.email);
    }

    // send mail
    if (toEmails.length > 0) {
      let dataEmail = {
        UserId: (boardingPass.user) ? boardingPass.user.id : null,
        Source: process.env.FROM_EMAIL,
        ToAddresses: toEmails,
        TemplateData: {
          "firstName": boardingPass.user.full_name,
          "passNumber": "Pass #: " + passNoPadZero,
          "fromDate": utility.formatDatetime(boardingPass.valid_from),
          "toDate": utility.formatDatetime(boardingPass.valid_to),
          "passType": (boardingPass.plan.title) ? boardingPass.plan.title : boardingPass.pass_type,
          "passStatus": boardingPass.status,
          "qrCodeUrl": qr_url
        }
      };

      return sqs.sendMail(dataEmail);
    }
  }


  /**
   * prepare push notification
   * 
   * @param {Object} boardingPass 
   * @param {*} platform 
   */
  var prepareNotificationPush = function (boardingPass, platform, pushMsg, pushData) {

    let push = {
      "userId": (boardingPass.user) ? boardingPass.user.id : null,
      "platform": platform,
      "notification": pushMsg,
      "data": pushData
    };

    return sqs.sendPush(push);
  }

  return processor;
}());

module.exports = processor.bootstrap();