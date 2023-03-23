'use strict'

const theMoment = require('moment');
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
   * get expiring pass
   * 
   * @param {Callback} next
   * @returns {Object}
   */
  hasura.prototype.getExpiringPasses = function (next) {

    let tomorrow = theMoment.utc().add(1, 'day');
    let startTime = tomorrow.startOf('day').toISOString();
    let endTime = tomorrow.startOf('day').toISOString();

    let query = `query ($startTime:timestamp!, $endTime:timestamp!){
      
      ${SCHEMA}_boarding_pass(
        where: {
          valid_to: {_gte: $startTime, _lte: $endTime},
          status: {_neq: "EXPIRED"}
        },
        order_by: {valid_to: asc}
      ) {
        id
        user_id
        pass_number
        status
        valid_from
        valid_to
        qr_code
        pass_type
        user {
          id
          full_name
          email
          country_code
          mobile
          active
          block
        }
        plan {
          title
          validity_days
        }
      }

    }`;

    fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          startTime,
          endTime
        }
      })
    })
    .then(res => res.json())
    .then((res) => {
      next(null, res.data[SCHEMA + '_boarding_pass']);
    })
    .catch((err) => {
      next(err, null);
    });

  };

  return hasura;
}());

module.exports = hasura.bootstrap();
