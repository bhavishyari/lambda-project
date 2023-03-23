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
   * Initialized a new instance of @hasura class.
   */
  function hasura() {};

  /**
   * Creates a new @hasura instance.
   */
  hasura.bootstrap = function () {
    return new hasura();
  };




  /**
   * Fetch the plan details
   * @param {string} plan_id the id of the plan
   * @returns {Promise<{
   * id: string,
   * title: string,
   * description: string
   * }>}
   */
  hasura.prototype.FetchUserSetting = async function (user_id) {
    /**
     * Create the GraphQL query for fetching the plan details
     * Details fetched are
     *  - id
     *  - title
     *  - description
     */

    let query = `
    query($user_id:uuid) {
      usetting:yt_user_setting(where: {user_id: {_eq: $user_id}}) {
        id
        params
      }
    }    
   `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        user_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched plan details
     */
    return (res.data) ? res.data.usetting[0].params : null;
  }


  /**
   * Run the GraphQL query on the Hasura instance
   * Use admin secret to authorize
   * 
   * @param {Object} body 
   */
   const sendRequest = async function (body) {

    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify(body)
      })
      .then(res => res.json());

    return res;

  };



  return hasura;
}());

module.exports = hasura.bootstrap();