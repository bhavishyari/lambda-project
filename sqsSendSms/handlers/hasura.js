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
   * get notification setting
   * 
   * @param {String} user_id
   * 
   * @returns {Object}
   */
  hasura.prototype.getNotificationSetting = async function (user_id) {

    let query = `query ($user_id:uuid!){
      yt_user_setting(where: {
        user_id: {_eq: $user_id}, 
        type: {_eq: "notification"}
      }) {
        id
        type
        params
        updated_at
        created_at
        user_id
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
          user_id: user_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return (res.data[SCHEMA + '_user_setting'][0]) ? res.data[SCHEMA + '_user_setting'][0] : null;

  };

  return hasura;
}());

module.exports = hasura.bootstrap();
