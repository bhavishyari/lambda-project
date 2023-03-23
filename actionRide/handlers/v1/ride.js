'use strict'


const theMoment = require('moment');
const hasura = require('./hasura');
const MSG = require('../messages');
const axios = require('axios')
const utility = require('./utility');




/**
 * ride
 * 
 * @class ride
 */
var ride = (function () {

  /**
   * slug of ride confirmation code counter
   */
  const SLUG_RIDE_CONFIRMATIN_CODE_COUNTER = "ride-confirmation-code";

  /**
   * ride status
   */
  const RIDE_STATUS = {
    NEW: "NEW",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETE: "COMPLETE",
    CANCELED: "CANCELED"
  };

  /**
   * boarding pass status
   */
  const PASS_STATUS = {
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED"
  };

  /**
   * boarding pass types
   */
  const PASS_TYPES = {
    AIRPORT_SERVICE: "AIRPORT_SERVICE",
    LIMITED_RIDES: "LIMITED_RIDES",
    UNLIMITED_RIDES: "UNLIMITED_RIDES"
  };


  /**
   * Initialized a new instance of @ride class.
   */
  function ride() {};

  /**
   * Creates a new @ride instance.
   */
  ride.bootstrap = function () {
    return new ride();
  };

  /**
   * Get by id
   * 
   * @param {String} id
   * 
   * @returns JSON
   */
  ride.prototype.create = async function (request) {

    let {
      body,
      headers
    } = request;

    try {


      const currentUserId = body.session_variables['x-hasura-user-id'];
      const currentUserRole = body.session_variables['x-hasura-role'];



      // check ride is in center location points

      // if (currentUserId == "691a473c-1806-4e8c-8abf-eb0d5a3f8910") {
        let startP = {
          lat: body.input.ride.start_location.lat,
          lng: body.input.ride.start_location.lon
        }

        let endP = {
          lat: body.input.ride.end_location.lat,
          lng: body.input.ride.end_location.lon

        }



        let locAr = await hasura.getLocationPointer();
        let checkS = checkStart(locAr, startP)
        let checkE = checkEnd(locAr, endP)

        if (!checkS || !checkE) {
          throw new Error(MSG.ERRORS.location_pointer_available);
        }
      // }

      // allow rider user
      if (!['rider'].includes(currentUserRole)) {
        throw new Error(MSG.ERRORS.not_authorized_to_send_boarding_pass);
      }

      //  get primary records
      let primaryRecords = await hasura.getRecordsForRideCreate(body.input.ride);


      if (primaryRecords.vehicles.length === 0) {
        throw new Error(MSG.ERRORS.vehicles_not_available);
      }

      if (!primaryRecords.user) {
        throw new Error(MSG.ERRORS.user_not_found);
      }

      if (primaryRecords.user.active !== true) {
        throw new Error(MSG.ERRORS.user_not_active);
      }

      if (primaryRecords.user.block !== false) {
        throw new Error(MSG.ERRORS.user_is_blocked);
      }

      // check 1 : is current user matched with user record?
      if (primaryRecords.user.type === 'rider' && primaryRecords.user.id !== currentUserId) {
        // console.log('currentUserId : ', currentUserId);
        throw new Error(MSG.ERRORS.not_authorized_to_create_ride);
      }

      if (!primaryRecords.boarding_pass) {
        throw new Error(MSG.ERRORS.boarding_pass_not_found);
      }

      // check 2 : is boarding pass is owned by user?
      if (primaryRecords.boarding_pass.user_id != currentUserId) {
        throw new Error(MSG.ERRORS.boarding_pass_not_linked_to_account);
      }


      // set boarding pass validity, while first ride booking
      if (primaryRecords.boarding_pass.status == PASS_STATUS.ACTIVE && primaryRecords.boarding_pass.rides.length == 0) {

        if (primaryRecords.boarding_pass.plan && primaryRecords.boarding_pass.plan.validity_days) {
          let validFromSet = theMoment.utc().toISOString();
          let validToSet = theMoment.utc().add(primaryRecords.boarding_pass.plan.validity_days, 'days').toISOString();
          let bPassUpdateRes = await hasura.setBoardingPassValidity(primaryRecords.boarding_pass.id, validFromSet, validToSet);
          if (bPassUpdateRes.length > 0) {
            // update primary record
            primaryRecords.boarding_pass.valid_from = bPassUpdateRes[0].valid_from;
            primaryRecords.boarding_pass.valid_to = bPassUpdateRes[0].valid_to;
          }
        } else {
          throw new Error(MSG.ERRORS.boarding_pass_validity_set_failed);
        }
      }
      // ---


      // check 3 : is boarding pass valid? validity and status check.
      isBoardingPassActive(primaryRecords.boarding_pass);


      // check 4 : is ride available for boarding pass? if pass type is LIMITED_RIDES
      checkRideLimit(primaryRecords);


      // get next confirmation code for ride record.
      let confCodeCount = await hasura.getNextConfirmationCode(SLUG_RIDE_CONFIRMATIN_CODE_COUNTER);
      primaryRecords['confirmation_code_count'] = confCodeCount;


      // create ride & ride request records
      let rideResponse = await hasura.createRideWithRequests(primaryRecords, body.input.ride);
      // console.log(rideResponse);



      return {
        statusCode: 200,
        body: JSON.stringify({
          id: rideResponse.ride.id,
          user_id: rideResponse.ride.user_id,
          boarding_pass_id: rideResponse.ride.boarding_pass_id,
          distance: rideResponse.ride.distance,
          status: rideResponse.ride.status
        })
      };

    } catch (err) {

      // console.log('err : ', err);
      // return RH.error400(err.message);

      console.log('err : ', err);

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: err.message
        })
      };
    }

  };

  /**
   * check boarding pass validity
   * 
   * @param {Object} boardingPass, {valid_from: '<DateTimeUTC>', valid_to: '<DateTimeUTC>'}
   */
  var isBoardingPassActive = function (boardingPass) {
    var validFromUtc = theMoment.utc(boardingPass.valid_from).toISOString();
    var nowUtc = theMoment().utc().toISOString();
    var validToUtc = theMoment.utc(boardingPass.valid_to).toISOString();
    if (theMoment(nowUtc).isAfter(validFromUtc) === false) {
      throw new Error(MSG.ERRORS.boarding_pass_validity_not_started);
    } else if (theMoment(nowUtc).isBefore(validToUtc) === false) {
      throw new Error(MSG.ERRORS.boarding_pass_is_expired);
    } else if (boardingPass.status !== PASS_STATUS.ACTIVE) {
      throw new Error(MSG.ERRORS.boarding_pass_is_not_active);
    }

    return true;
  }


  /**
   * check ride limit
   * 
   * @param {Object} primaryRecords 
   */
  var checkRideLimit = function (primaryRecords) {
    if (primaryRecords.boarding_pass.pass_type === PASS_TYPES.LIMITED_RIDES) {

      if (Number.isInteger(primaryRecords.boarding_pass.total_daily_trips) === false) {
        throw new Error(MSG.ERRORS.total_daily_trip_value_invalid);
      }

      if (Number.isInteger(primaryRecords.boarding_pass.total_trips) === false) {
        throw new Error(MSG.ERRORS.total_trip_value_invalid);
      }

      if (primaryRecords.rides_aggregate.aggregate.count >= primaryRecords.boarding_pass.total_trips) {
        throw new Error(MSG.ERRORS.no_trip_available_for_your_boarding_pass);
      }

    }
  }



  var arePointsNear = function (checkPoint, centerPoint) {
    var km = centerPoint.radius * 1.6;
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerPoint.lat / 180.0) * ky;
    var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
    var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= km;
  }


  var getDistanceFromLatLonInKm = function (fir, sec) {
    let lat1 = fir.lat
    let lon1 = fir.lng
    let lat2 = sec.lat
    let lon2 = sec.lng
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
  }


  var deg2rad = function (deg) {
    return deg * (Math.PI / 180)
  }


  var checkStart = function (locAr, startPoint) {
    for (let loc in locAr) {
      let dbPoints = {
        lat: locAr[loc].latitude,
        lng: locAr[loc].longitude,
        radius: locAr[loc].radius
      }
      var locStart = arePointsNear(startPoint, dbPoints);
      var distanceS = getDistanceFromLatLonInKm(startPoint, dbPoints)

      console.log(distanceS, 'distanceS')
      if (locStart) {
        return true;
      }
    }

    return false;
  }

  function checkEnd(locAr, endPoint) {
    for (let loc in locAr) {
      let dbPoints = {
        lat: locAr[loc].latitude,
        lng: locAr[loc].longitude,
        radius: locAr[loc].radius

      }
      var locStart = arePointsNear(endPoint, dbPoints);
      var distanceE = getDistanceFromLatLonInKm(endPoint, dbPoints)

      console.log(distanceE, 'distanceE')
      if (locStart) {
        return true;
      }
    }

    return false;
  }




  return ride;
}());

module.exports = ride.bootstrap();