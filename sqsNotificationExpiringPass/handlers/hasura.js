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
  function hasura() { };


  /**
   * Creates a new @hasura instance.
   */
  hasura.bootstrap = function () {
    return new hasura();
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

    let res = await fetch(HASURA_ENDPOINT, {
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

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }
    
    // console.log(res.data);
    return {
      notifications: res.data['notifications']['returning']
    };
  }



  
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


  return hasura;
}());

module.exports = hasura.bootstrap();
