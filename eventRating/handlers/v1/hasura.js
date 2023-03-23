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
   * get average ratings for user
   * 
   * @param {String} user_id
   * 
   * @returns {Object} records from various tables
   */
  hasura.prototype.getAverageRating = async function (user_id) {

    let query = `query ($user_id:uuid!){

        ${SCHEMA}_rating_aggregate(
          where: {
            to_user_id: {_eq: $user_id}, 
            deleted_at: {_is_null: true}
          }) {
          aggregate {
            avg {
              given_rate
            }
            count(columns: id)
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
          user_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }
    return {
      rating_aggregate: res.data[SCHEMA + '_rating_aggregate']
    };

  };

  /**
   * Update user record
   * 
   * @param {UUID} user_id
   * @param {Number} average_rate
   * 
   * @returns {Object}
   */
  hasura.prototype.updateUser = async function (user_id, average_rate) {

    let query = `mutation UpdateUser($user_id:uuid!, $average_rate:float8!){

      update_${SCHEMA}_user(
        where: {
          id: {_eq: $user_id}
        },
        _set: {
          average_rate: $average_rate
        }) {
        returning {
          id
          email
          average_rate
          created_at
          updated_at
        }
        affected_rows
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
          user_id,
          average_rate
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return res.data["update_" + SCHEMA + "_user"]['returning'];
  }


  return hasura;
}());

module.exports = hasura.bootstrap();
