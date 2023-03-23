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
   * get expired pass
   * 
   * @param {Callback} next
   * @returns {Object}
   */

  hasura.prototype.getExpiredPasses = function (next) {

    // console.log('hasura.prototype.getExpiredPasses START');

    let current_time = theMoment.utc().toISOString();

    let query = `query ($current_time:timestamp!){
      
      ${SCHEMA}_boarding_pass(
        where: {
          valid_to: {_lte: $current_time}
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
          current_time
        }
      })
    })
    .then(res => res.json())
    .then((res) => {
      // console.log('hasura.prototype.getExpiredPasses THEN');
      // console.log(res);
      next(null, res.data[SCHEMA + '_boarding_pass']);
    })
    .catch((err) => {
      // console.log('hasura.prototype.getExpiredPasses CATCH');
      next(err, null);
    });

  };



   
  hasura.prototype.updateExpiredPasses = function (next) {

    // console.log('hasura.prototype.getExpiredPasses START');

    


    let current_time = theMoment.utc().toISOString();
    console.log(current_time,'current_time')

    let query = `mutation ($current_time:timestamp!){
      update_${SCHEMA}_boarding_pass(
        where: {
      valid_to: {_lte: $current_time}
            status: {_neq: "EXPIRED"}
        }, 
        _set: {
          status: "EXPIRED"
        }) {
        affected_rows
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
          current_time
        }
      })
    })
    .then(res => res.json())
    .then((res) => {
      console.log(res,'responses dat')
      // console.log('hasura.prototype.getExpiredPasses THEN');
      // console.log(res);
      next(null, res.data);
    })
    .catch((err) => {
      console.log(err,'hasur aeero error')
      // console.log('hasura.prototype.getExpiredPasses CATCH');
      next(err, null);
    });

  };
  return hasura;
}());

module.exports = hasura.bootstrap();
