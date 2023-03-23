const theMoment = require('moment-timezone');
const _find = require('lodash.find');
const _ = require('lodash');
const {
  updateLocale
} = require('moment-timezone');

/**
 * Slice out the first name from the full name of the user
 * @param {string} full_name the full name
 * @returns {string} the first name 
 */

const getNotificationContent = (textCn, upParam = null) => {
  // let textCn = "<driver_name> has arrived and waiting for you at your location in a Yello with Licence Plate no. <license_number> Please call him on <driver_contact_number> if you are facing any trouble locating your chauffeur.";
  console.log(textCn, upParam, 'content, upParam')

  if (upParam) {
    Object.keys(upParam).forEach((key) => {
      textCn = _.replace(textCn,key, upParam[key]);
      // textCn = textCn.replaceAll(key, upParam[key]);
    });
    return textCn;
  }
  return textCn;
}
const GetFirstnameFromFullName = full_name => {
  /**
   * Get the index of the space between firstname and lastname
   * If the space between does not exist take the full length as firstname
   */
  let spaceIndex = full_name.indexOf(' ');
  if (spaceIndex === -1) {
    spaceIndex = full_name.length;
  }

  return full_name.slice(0, spaceIndex);
}

/**
 * format pass number
 * 
 * @param {String} num
 * 
 * @returns {String}
 */
const FormatPassNo = num => {

  num = num + "";
  if (num.length < 5) {
    return num.padStart(5, '0');
  } else {
    return num;
  }
};


/**
 * convert address to single line
 * 
 * @param {Object} adr {line1: 'String', line2: 'String', city: 'String', state: 'String', zipcode: 'String'}
 * 
 * @returns {String}
 */
const FormatAddress = adr => {

  var address = (adr.line1) ? adr.line1 : '';

  if (adr.line2) {
    address += ', ' + adr.line2;
  }

  if (adr.city) {
    address += ', ' + adr.city;
  }

  if (adr.state) {
    address += ' ' + adr.state;
  }

  if (adr.zipcode) {
    address += ' ' + adr.zipcode;
  }

  return address;
};

/**
 * format date time
 * 
 * @param {String} datetime 
 * @param {String} timezone
 * 
 * @returns {String}
 */
const FormatDatetime = (datetime, timezone) => {

  /**
   * default timezone
   */
  const TIMEZONE = "America/Phoenix";

  /**
   * date time format
   */
  const DATETIME_FORMAT = "MM-DD-YYYY hh:mm:ss A";

  if (!timezone) {
    timezone = TIMEZONE;
  }

  return theMoment.tz(datetime, timezone).format(DATETIME_FORMAT);
};

/**
 * Build QR code url for bording pass
 * 
 * @param {*} passNumber 
 * @param {*} qrCoce 
 */
const BoardingPassQR = (passNumber, qrCoce) => {
  let qrUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl={pass_number:${passNumber},qr_code:${qrCoce}}&choe=UTF-8`;
  return qrUrl;
};

/**
 * Get notification from user object
 * 
 * @param {Object} user 
 * @param {String} module 
 * @param {String} type 
 */
const GetNotificationSetting = (user, module, type) => {
  let flag = false;
  if (user.user_settings && user.user_settings.params) {
    if (user.user_settings.params[module]) {
      if (user.user_settings.params[module][type] && user.user_settings.params[module][type] == true) {
        flag = true;
      }
    }
  }

  return flag;
};


/**
 * Get notification setting from assigned roles
 * 
 * @param {Object} user 
 * @param {String} module 
 * @param {String} type 
 */
const GetNotificationSettingFromRole = (user, module, type) => {

  /*
  // valid modules
  {
      "refund": {
          "push": true
      },
      "helpdesk": {
          "push": true
      },
      "tax_management": {
          "push": true
      },
      "rider_management": {
          "push": true
      },
      "sales_management": {
          "push": true
      },
      "access_management": {
          "push": true
      },
      "driver_management": {
          "push": true,
          "email": true
      },
      "rating_management": {
          "push": true
      },
      "report_management": {
          "push": true
      },
      "content_management": {
          "push": true
      },
      "payment_management": {
          "push": true
      },
      "vehicle_management": {
          "push": true
      },
      "promocode_management": {
          "push": true
      },
      "subscription_management": {
          "push": true
      }
  }
  */

  let flag = false;

  if (user.user_roles && user.user_roles.length > 0) {

    user.user_roles.forEach(uRole => {
      if (uRole.role && uRole.role.notification_setting) {
        if (uRole.role.notification_setting[module] && uRole.role.notification_setting[module][type] === true) {
          flag = true;
        }
      }
    });

  }

  return flag;
};

/**
 * format amount with currency symbol
 * 
 * @param {String} amount
 * 
 * @returns {String}
 */
const FormatAmount = amount => {

  /**
   * default currency symbol
   */
  const CURRENCY_SYM = "$";

  amount = parseFloat(amount);

  return CURRENCY_SYM + amount.toFixed(2);
};


/**
 * check given user is subscribed for push notification or not
 * 
 * @param {Object} user 
 * @param {String} platform 
 */
const IsSubscribedForPush = (user, platform) => {
  // console.log(user);
  // user.push_registrations{
  //   id
  //   token
  //   platform
  //   provider
  //   device_id
  // }
  return true;
  let webPushTokens = _find(user.push_registrations, {
    platform: platform
  });
  return (webPushTokens) ? true : false;
};

/**
 * Format vehicle make and model
 * 
 * @param {Object} vehicle 
 * 
 * @returns {String} combined vehicle make and model.
 */
const FormatVehicleMakeModel = (vehicle) => {

  let vehicleMakeModel = '';

  if (vehicle) {

    if (vehicle.vehicle_make && vehicle.vehicle_make.title) {
      vehicleMakeModel += vehicle.vehicle_make.title;
    }

    if (vehicle.vehicle_model && vehicle.vehicle_model.title) {
      vehicleMakeModel += ' ' + vehicle.vehicle_model.title;
    }
  }

  return vehicleMakeModel;
}

module.exports = {
  GetFirstnameFromFullName,
  FormatPassNo,
  FormatAddress,
  FormatDatetime,
  BoardingPassQR,
  GetNotificationSetting,
  GetNotificationSettingFromRole,
  FormatAmount,
  IsSubscribedForPush,
  FormatVehicleMakeModel,
  getNotificationContent
};