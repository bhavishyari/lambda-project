'use strict'

const fetch = require('node-fetch');
const uuidV4 = require('uuid').v4;
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
   * get primary records for boarding pass sending
   * 
   * @param {Object} params from request {user_id, boarding_pass_id}
   * 
   * @returns {Object} records from various tables
   */
  hasura.prototype.getRecordsForPassSending = async function (params) {

    // params.user_id
    // params.boarding_pass_id

    let query = `query ($boarding_pass_id:uuid!){

        ${SCHEMA}_boarding_pass_by_pk(id: $boarding_pass_id) {
          id
          valid_to
          valid_from
          status
          qr_code
          pass_type
          pass_number
          user_id
          user {
            id
            full_name
            email
            country_code
            mobile
            active
            block
          }
          order {
            order_number
          }
          plan {
            title
            validity_days
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
          boarding_pass_id: params.boarding_pass_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      boarding_pass: res.data[SCHEMA + '_boarding_pass_by_pk']
    };

  };


  return hasura;
}());

module.exports = hasura.bootstrap();
