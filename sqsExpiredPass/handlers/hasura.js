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
   * update boarding pass status
   * 
   * @param {String} id
   * 
   * @returns {Object}
   */
  hasura.prototype.updateBoardingPassStatus = async function (id) {

    let query = `mutation MyMutation ($id:uuid!){

      update_${SCHEMA}_boarding_pass(
        where: {
          id: {_eq: $id}, 
          status: {_neq: "EXPIRED"}
        }, 
        _set: {
          status: "EXPIRED"
        }) {
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
          id
        }
      })
    }).then(res => res.json());


    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return res.data['update_'+SCHEMA+'_boarding_pass']['affected_rows'];
  };

  return hasura;
}());

module.exports = hasura.bootstrap();
