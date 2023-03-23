'use strict'

// var _indexOf = require('lodash.indexof');
// // const theMoment = require('moment');
const theMoment = require('moment-timezone');
// const RH = require('./../response');
// const JWT = require('./jwt');
const hasura = require('./hasura');
const SQS = require('./sqs');
const MSG = require('../messages');

/**
 * boardingPass
 * 
 * @class boardingPass
 */
var boardingPass = (function () {

  /**
   * default timezone
   */
  const TIMEZONE = "America/Phoenix";

  /**
   * date time format
   */
  const DATETIME_FORMAT = "MM-DD-YYYY hh:mm:ss A";

  /**
   * Initialized a new instance of @boardingPass class.
   */
  function boardingPass() { };

  /**
   * Creates a new @boardingPass instance.
   */
  boardingPass.bootstrap = function () {
    return new boardingPass();
  };

  /**
   * Send boarding pass to user
   * 
   * @param {Object} request
   * 
   * @returns JSON
   */
  boardingPass.prototype.send = async function (request) {

    let { body, headers } = request;

    
    try {

     
      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];

      // allow admin, driver or sales user to send boarding pass to user.
      if ( !['admin', 'driver', 'sales'].includes(currentUserRole) ) {
        throw new Error(MSG.ERRORS.not_authorized_to_send_boarding_pass);
      }


      //  get primary records
      let primaryRecords = await hasura.getRecordsForPassSending(body.input);

      if (!primaryRecords.boarding_pass) {
        throw new Error(MSG.ERRORS.boarding_pass_not_found);
      }

      if (primaryRecords.boarding_pass.user.active !== true) {
        throw new Error(MSG.ERRORS.user_is_not_active_you_cannot_send_boarding_pass);
      }

      if (primaryRecords.boarding_pass.user.block === true) {
        throw new Error(MSG.ERRORS.user_is_blocked_you_cannot_send_boarding_pass);
      }


      // console.log('primaryRecords : ', primaryRecords);


      // check 3 : is boarding pass valid? validity and status check.
      isBoardingPassActive(primaryRecords.boarding_pass);


      // send notifications, email, sms & push
      let sqsNotifications = [];
      sqsNotifications.push( prepareNotificationEmail(body, primaryRecords) );

      if (primaryRecords.boarding_pass.user 
        && primaryRecords.boarding_pass.user.country_code 
        && primaryRecords.boarding_pass.user.mobile) {
        sqsNotifications.push( prepareNotificationSms(primaryRecords) );
        // console.log(smsRes);
      }
      sqsNotifications.push( prepareNotificationPush(primaryRecords, 'android') );
      sqsNotifications.push( prepareNotificationPush(primaryRecords, 'webpush') );
      
      await Promise.all(sqsNotifications);



      return {
        statusCode: 200,
        body: JSON.stringify({
          boarding_pass_id: body.input.boarding_pass_id,
          status: 'success'
        })
      }

    } catch (err) {
      console.log('err : ', err);
      // return RH.error400(err.message);

      // console.log(err);

      return {
          statusCode: 400,
          body: JSON.stringify({
              message: err.message
          })
      }
    }

  };


  /**
   * check boarding pass validity
   * 
   * @param {Object} boardingPass, {valid_from: '<DateTimeUTC>', valid_to: '<DateTimeUTC>', status: '<Status>'}
   */
  var isBoardingPassActive = function (boardingPass) {
    var validFromUtc = theMoment.utc(boardingPass.valid_from).toISOString();
    var nowUtc = theMoment().utc().toISOString();
    var validToUtc = theMoment.utc(boardingPass.valid_to).toISOString();

    if (theMoment(nowUtc).isAfter(validFromUtc) === false) {
      // throw new Error(MSG.ERRORS.boarding_pass_validity_not_started);
    } else if (theMoment(nowUtc).isBefore(validToUtc) === false) {
      throw new Error(MSG.ERRORS.boarding_pass_is_expired);
    } else if (boardingPass.status !== 'ACTIVE') {
      throw new Error(MSG.ERRORS.boarding_pass_is_not_active);
    }

    return true;
  }


  /**
   * prepare email notification
   * 
   * @param {Object} body 
   * @param {Object} primaryRecords 
   */
  var prepareNotificationEmail = function(body, primaryRecords) {

    let passNoPadZero = formatPassNo(primaryRecords.boarding_pass.pass_number);
    let qr_url = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl={pass_number:${passNoPadZero},qr_code:${primaryRecords.boarding_pass.qr_code}}&choe=UTF-8`;

    // collect to email addresses.
    var toEmails = [];
    if (primaryRecords.boarding_pass.user.email) {
      toEmails.push(primaryRecords.boarding_pass.user.email);
    }

    if (body.input.email) {
      toEmails.push(body.input.email);
    }

    // send mail
    if (toEmails.length > 0) {
      let dataEmail = {
        UserId: primaryRecords.boarding_pass.user.id,
        Source: process.env.FROM_EMAIL,
        ToAddresses: toEmails,
        TemplateData: {
          "firstName": primaryRecords.boarding_pass.user.full_name,
          "passNumber": "Pass #: " + passNoPadZero,
          "fromDate": (primaryRecords.boarding_pass.valid_from) ? formatDatetime(primaryRecords.boarding_pass.valid_from, TIMEZONE) : primaryRecords.boarding_pass.plan.validity_days + " days",
          "toDate": (primaryRecords.boarding_pass.valid_to) ? formatDatetime(primaryRecords.boarding_pass.valid_to, TIMEZONE) : "from first use",
          "passType": primaryRecords.boarding_pass.plan.title,
          "passStatus": primaryRecords.boarding_pass.status,
          "qrCodeUrl": qr_url
        }
      };

      return SQS.sendBoardingPassMail(dataEmail);
    }
  }

  /**
   * prepare sms notification
   * 
   * @param {Object} primaryRecords 
   */
  var prepareNotificationSms = function(primaryRecords) {

    let passNoPadZero = formatPassNo(primaryRecords.boarding_pass.pass_number);
    let validFrom = (primaryRecords.boarding_pass.valid_from) ? formatDatetime(primaryRecords.boarding_pass.valid_from, TIMEZONE) : "";
    let validTo   = (primaryRecords.boarding_pass.valid_to) ? formatDatetime(primaryRecords.boarding_pass.valid_to, TIMEZONE) : "";

    let validityDates = "";
    if (validFrom && validTo) {
      validityDates = `${validFrom} to ${validTo}`;
    }
    let validityText = `Validity: ${primaryRecords.boarding_pass.plan.validity_days} days, ${validityDates}\n`;

    let dataSms = {
      "UserId": primaryRecords.boarding_pass.user.id,
      "Message": `Yello boarding pass\nPass #: ${passNoPadZero}\n${validityText}Type: ${primaryRecords.boarding_pass.plan.title}\nStatus: ${primaryRecords.boarding_pass.status}`,
      "PhoneNumber": `${primaryRecords.boarding_pass.user.country_code}${primaryRecords.boarding_pass.user.mobile}`
    };

    console.log('dataSms : ', dataSms);

    return SQS.sendBoardingPassSms(dataSms);
  }


  /**
   * prepare push notification
   * 
   * @param {*} primaryRecords 
   * @param {*} platform 
   */
  var prepareNotificationPush = function(primaryRecords, platform) {

    let data = {
      "boarding_pass": {
        "id": primaryRecords.boarding_pass.id,
        "pass_number": formatPassNo(primaryRecords.boarding_pass.pass_number),
        "valid_from": formatDatetime(primaryRecords.boarding_pass.valid_from, TIMEZONE),
        "valid_to": formatDatetime(primaryRecords.boarding_pass.valid_to, TIMEZONE),
        "pass_type": primaryRecords.boarding_pass.pass_type,
        "status": primaryRecords.boarding_pass.status
      }
    };

    let push = {
      "userId": primaryRecords.boarding_pass.user.id,
      "platform": platform,
      "notification": {
        "title": "Boarding pass",
        "body": "Your boarding pass is generated."
      },
      "data": data
    };

    return SQS.sendBoardingPassPush(push);
  }
 

  /**
   * format pass number
   * 
   * @param {String} num
   * 
   * @returns {String}
   */
  var formatPassNo = function (num) {
    num = num + "";
    if (num.length < 5) {
      return num.padStart(5, '0');
    } else {
      return num;
    }
  }

  /**
   * format date time
   * 
   * @param {String} datetime 
   * @param {String} timezone
   * 
   * @returns {String}
   */
  var formatDatetime = function(datetime, timezone) {
    return theMoment.tz(datetime, timezone).format(DATETIME_FORMAT);
  }


  return boardingPass;
}());

module.exports = boardingPass.bootstrap();
