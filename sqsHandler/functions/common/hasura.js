'use strict'

const fetch = require('node-fetch');
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * hasura request handler
 * 
 * @class hasura
 */
var hasura = (function () {

  /**
   * database schema
   */
  const SCHEMA = "yt";

  /**
   * Initialized a new instance of @hasura class.
   */
  function hasura() { };


  /**
   * Creates a new @hasura instance.
   */
  hasura.bootstrap = function () {
    return new hasura();
  };


  /**
   * get ride by ride_id with rating record count
   * 
   * @param {String} ride_id
   * @param {String} user_id
   * 
   * @returns {Object} yt_ride record
   */
  hasura.prototype.getRideRecordAndRatingsCount = async function (ride_id, user_id, driver_user_id) {

    let query = `query ($ride_id:uuid!, $user_id:uuid!, $driver_user_id:uuid!){

        ride: ${SCHEMA}_ride_by_pk(id: $ride_id) {
          id
          boarding_pass_id
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          start_at
          end_at
          status
          user_id
          vehicle_id
          route_map_file_id
          user {
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          driver {
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          boarding_pass {
            id
            pass_number
            pass_type
          }
        }
  
        rating_by_rider: yt_rating_aggregate(
          where: {
            from_user_id: {_eq: $user_id},
            ride_id: {_eq: $ride_id}
          }
        ) {
          aggregate {
            count(columns: [id])
          }
        }
  
        rating_by_driver: yt_rating_aggregate(
          where: {
            from_user_id: {_eq: $driver_user_id},
            ride_id: {_eq: $ride_id}
          }
        ) {
          aggregate {
            count(columns: [id])
          }
        }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id,
          user_id,
          driver_user_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data.ride,
      rating_by_rider: res.data.rating_by_rider.aggregate.count,
      rating_by_driver: res.data.rating_by_driver.aggregate.count
    };

  };



  /**
   * create notification records
   * 
   * @param {Array} objects [{
   *   "content": {
   *     "title": "This is title",
   *     "message": "This is message",
   *     "data": {
   *     }
   *   }, 
   *   "priority": "HIGH", 
   *   "sender_user_id": "a84af858-9293-4cf9-9873-7153fb615a45", 
   *   "target": "USER", 
   *   "user_id": "a84af858-9293-4cf9-9873-7153fb615a45"
   * }]
   * 
   * @returns {Array} Notifiation records.
   */
  hasura.prototype.addInAppNotification = async function (objects) {
    let query = `mutation MyMutation($objects:[yt_notification_insert_input!]!) {
      notifications: insert_yt_notification(
        objects: $objects
      ) {
        returning {
          id
        }
      }
    }`;

    return fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          objects
        }
      })
    }).then(res => res.json());
    
  }

  return hasura;
}());

module.exports = hasura.bootstrap();
