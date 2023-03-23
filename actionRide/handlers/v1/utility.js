'use strict'

const theMoment = require('moment-timezone');
const axios = require('axios')

/**
 * utility
 * 
 * @class utility
 */
var utility = (function () {

  /**
   * default timezone
   */
  const TIMEZONE = "America/Phoenix";

  /**
   * date time format
   */
  const DATETIME_FORMAT = "MM-DD-YYYY hh:mm:ss A";

  /**
   * Initialized a new instance of @utility class.
   */
  function utility() {};

  /**
   * Creates a new @utility instance.
   */
  utility.bootstrap = function () {
    return new utility();
  };

  /**
   * format pass number
   * 
   * @param {String} num
   * 
   * @returns {String}
   */
  utility.prototype.formatPassNo = function (num) {

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
  utility.prototype.formatAddress = function (adr) {

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
  utility.prototype.formatDatetime = function (datetime, timezone) {

    if (!timezone) {
      timezone = TIMEZONE;
    }

    return theMoment.tz(datetime, timezone).format(DATETIME_FORMAT);
  }



  utility.prototype.snedRideInThirdParty = function (method, RideData) {

    //KEPTYN API Integration.
    // try {
     
    // var postData = {
    //   "VehicleID": RideData.cab_number,
    //   "RideReference": RideData.ride_id,
    //   "Latitude": RideData.lat,
    //   "Longitude": RideData.lon
    // }

    // axios({
    //   method: method,
    //   url: 'https://api.triadtranstech.com:5005/hailapi/minted/ride',
    //   headers: {
    //     'Api-Key': 'MINTDEV932M282NBHALFP06532BVZXSYF734M6N9DHTJU82752',
    //     'Content-Type': 'application/json'
    //   },
    //   data: postData
    // }) 
    // } catch (error) {
      
    // }
  }



  return utility;
}());

module.exports = utility.bootstrap();