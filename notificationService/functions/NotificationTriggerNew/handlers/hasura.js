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
   * Fetch notification related details of a particular user
   * @param {string} user_id the id of the user whose details are to be fetched
   * 
   * @returns {Promise<{
   * id: string, full_name: string, email: string | null, country_code: string, mobile: string
   * push_registrations: null | {id: string, token: string, platform: string, provider: string, device_id: string}
   * }>} the user details
   */
  hasura.prototype.FetchUser = async function (user_id) {
    /**
     * Create GraphQL query to fetch user's details
     * Details fetched are
     *  - id                    the id of the user
     *  - full_name             the full name of the user
     *  - email                 the email of the user if exists
     *  - country_code          the user's mobile number's country code
     *  - mobile                the mobile number of the user
     *  - push_registrations    the push notification registrations for the user
     *      - id                the id of the registration
     *      - token             the token to be used while sending notification
     *      - platform          the user device platform (`mobile` | `web`)
     *      - provider          the push notification provider (`FIREBASE`)
     *      - device_id         the user's device to send notifications to
     */
    let query = `
      query($user_id:uuid!){
          user: yt_user_by_pk(id:$user_id){
              id
              full_name
              email
              country_code
              mobile
              type
              push_registrations{
                  id
                  token
                  platform
                  provider
                  device_id
              }
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

    // console.log(res);

    /**
     * Else return the fetched user details
     */
    return (res.data && res.data.user) ? res.data.user : null;
  };


  /**
   * Fetch the details of the ride request
   * @param {string} ride_request_id the id of the ride request
   * 
   * @returns {Promise<{
   * id: string, 
   * rider: {full_name: string, country_code: string, mobile: string, email: string},
   * driver: {full_name: string, country_code: string, mobile: string, email: string},
   * ride: {id: string, start_location: string, end_location: string, start_address: JSON, end_address: JSON, distance: number}
   * }>}
   */
  hasura.prototype.FetchRideRequest = async function (ride_request_id) {

    let query = `
      query ($ride_request_id: uuid!) {
          ride_request: yt_ride_request_by_pk(id: $ride_request_id) {
              id
              eta_number
              eta_unit
              rider: user {
                  id
                  full_name
                  country_code
                  mobile
                  email
                  type
                  push_registrations{
                    id
                    token
                    platform
                    provider
                    device_id
                  }
              }
              vehicle {
                id
                registration_number
              }
              driver {
                  id
                  full_name
                  country_code
                  mobile
                  email
                  push_registrations{
                    id
                    token
                    platform
                    provider
                    device_id
                  }
              }
              ride {
                  id
                  start_location
                  end_location
                  start_address
                  end_address
                  distance
              }
          }
      }      
    `;


    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        ride_request_id
      }
    });


    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched ride request details
     */
    return (res.data && res.data.ride_request) ? res.data.ride_request : null;
  }


  /**
   * Fetch ride details like rider and driver
   * @param {string} ride_id the id of the rid to fetch details for
   * 
   * @returns {Object} Ride record
   */
  hasura.prototype.FetchRideDetails = async function (ride_id) {
    /**
     * Define the GraphQL query for fetching ride details
     */
    let query = `
       query($ride_id: uuid!){
           ride: yt_ride_by_pk(id: $ride_id){
               id
               confirmation_code
               distance
               start_address
               end_address
               cancellation_reason
               driver {
                   id
                   full_name
                   email
                   country_code
                   mobile
                   push_registrations{
                     id
                     token
                     platform
                     provider
                     device_id
                  }
               }
               user {
                   id
                   full_name
                   email
                   country_code
                   mobile
                   push_registrations{
                     id
                     token
                     platform
                     provider
                     device_id
                  }
               }
               cancelled_by{
                  id
                  full_name
                  type
               }
               boarding_pass{
                 pass_number
               }
               vehicle {
                 id
                 registration_number
                 vehicle_make {
                  title
                 }
                 vehicle_model {
                   title
                 }
               }
           }
       }
    `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        ride_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched ride details
     */
    return (res.data && res.data.ride) ? res.data.ride : null;
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






  /**
   * Fetch the plan details
   * @param {string} plan_id the id of the plan
   * @returns {Promise<{
   * id: string,
   * title: string,
   * description: string
   * }>}
   */
  hasura.prototype.FetchPlan = async function (plan_id) {
    /**
     * Create the GraphQL query for fetching the plan details
     * Details fetched are
     *  - id
     *  - title
     *  - description
     */
    let query = `
       query($plan_id: uuid!){
           plan: yt_plan_by_pk(id: $plan_id){
               id
               title
               description
               total_trips
               validity_days
           }
       }
   `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        plan_id
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
    return (res.data && res.data.plan) ? res.data.plan : null;
  }


  /**
   * Fetch the payment details
   * @param {string} payment_id the id of the payment
   * 
   * @returns {Promise<{
   * id: string,
   * user: {id: string, full_name: string, email: string, country_code: string, mobile: string,
   *  push_registrations: null | {id: string, token: string, platform: string, provider: string, device_id: string}},
   * order: {id: string, order_number: number}
   * }>} the payment details
   */
  hasura.prototype.FetchPayment = async function (payment_id) {
    /**
     * Generate a GraphQL query for fetching payment details
     * Details fetched are
     *  - id                        the id of the payment record
     *  - user                      the user who made this payment
     *      - id                    the id of the user
     *      - full_name             the full name of the user
     *      - email                 the email address of the user
     *      - country_code          the mobile number's country code
     *      - mobile                the mobile number of the user
     *      - push_registrations    the push registrations subscribed by the user
     *          - id                the id of the subscription
     *          - token             the token required for push notification
     *          - platform          the platform of notification(`WEB` | `MOBILE`)
     *          - provider          the provider providing the PUSH notification service(`FIREBASE`)
     *          - device_id         the id of the device to send the PUSH notification to
     *  - order                     the order for which this payment is made
     *      - id                    the id of the order
     *      - order_number          the order number
     */
    let query = `
        query($payment_id: uuid!){
            payment: yt_payment_by_pk(id: $payment_id){
                id
                user{
                    id
                    full_name
                    email
                    country_code
                    mobile
                    push_registrations{
                        id
                        token
                        platform
                        provider
                        device_id
                    }
                }
                order{
                    id
                    order_number
                    service{
                      title
                      type
                    }
                    plan{
                      title
                      validity_days
                    }
                }
            }
        }
    `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        payment_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched payment details
     */
    return (res.data && res.data.payment) ? res.data.payment : null;
  }



  /**
   * Fetch rating related details
   * @param {string} rating_id the id of the rating to fetch
   * 
   * @returns {Promise<{
   * id: string,
   * from_user:{full_name: string},
   * to_user: {full_name: string, email: string},
   * ride: {id: string, start_address: JSON, end_address: JSON, created_at: Date, status: string}
   * }}
   */
  hasura.prototype.FetchRatingDetails = async function (rating_id) {
    /**
     * Define GraphQL query to fetch rating details
     * Details fetched are
     *  - id
     *  - from_user
     *      - full_name
     *  - to_user
     *      - full_name
     *      - email
     *  - ride
     *      - id
     *      - start_address
     *      - end_address
     *      - created_at
     *      - status
     */
    let query = `
      query($rating_id: uuid!){
          rating: yt_rating_by_pk(id: $rating_id){
              id
              given_rate
              comment
              from_user_type
              from_user{
                  id
                  full_name
                  email
                  type
              }
              to_user{
                  id
                  full_name
                  email
                  type
                  push_registrations{
                    id
                    token
                    platform
                    provider
                    device_id
                  }
              }
              ride{
                  id
                  start_address
                  end_address
                  created_at
                  status
              }
          }
      }
    `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        rating_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched rating details
     */
    return (res.data && res.data.rating) ? res.data.rating : null;
  }


  /**
   * Fetch the details of the ride issue
   * @param {string} ride_issue_id the id of the ride issue
   * 
   * @returns {Object} Ride issue record with related user and driver information.
   */
  hasura.prototype.FetchRideIssue = async function (ride_issue_id) {
    /**
     * Create a GraphQL query to fetch details or the requested ride
     * Details fetched are
     *  - id
     *  - note
     *  - issue
     *      - id
     *      - description
     *      - type
     *  - user
     *      - full_name
     *      - country_code
     *      - mobile
     *      - email
     *  - driver_user
     *      - full_name
     *      - country_code
     *      - mobile
     *      - email
     *  - ride
     *      - id
     *      - start_location
     *      - end_location
     *      - start_address
     *      - end_address
     *      - distance
     */
    let query = `
      query ($ride_issue_id: uuid!) {
          ride_issue: yt_ride_issue_by_pk(id: $ride_issue_id) {
              id
              note
              issue {
                  id
                  description
                  type
              }
              user {
                  full_name
                  country_code
                  mobile
                  email
              }
              driver_user {
                  full_name
                  country_code
                  mobile
                  email
              }
              ride {
                  id
                  start_location
                  end_location
                  start_address
                  end_address
                  distance
              }
          }
      }
    `;


    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        ride_issue_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched ride issue details
     */
    return (res.data && res.data.ride_issue) ? res.data.ride_issue : null;
  }


  /**
   * Fetch all admin and sub admin users
   * 
   * @returns {Object} admin users
   */
  hasura.prototype.FetchAdminAndSubAdminUsers = async function () {
    /**
     * Create GraphQL query to fetch user's details
     * Details fetched are
     *  - id                    the id of the user
     *  - full_name             the full name of the user
     *  - email                 the email of the user if exists
     *  - country_code          the user's mobile number's country code
     *  - mobile                the mobile number of the user
     *  - push_registrations    the push notification registrations for the user
     *      - id                the id of the registration
     *      - token             the token to be used while sending notification
     *      - platform          the user device platform (`android` | `webpush`)
     *      - provider          the push notification provider (`fcm`)
     *      - device_id         the user's device to send notifications to
     */
    let query = `
      query MyQuery {
          users: yt_user(where: {
              active: {_eq: true}, 
              block: {_eq: false}, 
              _or:[
                  {type: {_eq: "admin"}},
                  {type: {_eq: "sub-admin"}}
              ]
          }) {
          id
          full_name
          email
          country_code
          mobile
          type
          push_registrations {
              id
              token
              platform
              provider
              device_id
          }
          user_roles {
              id
              role {
                  name
                  notification_setting
              }
          }
        }
      }
    `;


    /**
     * send request
     */
    let res = await sendRequest({
      query
    });


    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched users details
     */
    return (res.data && res.data.users) ? res.data.users : null;
  }


  /**
   * Fetch the details of the refund request
   * @param {string} refund_request_id the id of the refund request
   * 
   * @returns {Object} Refund request record with related information.
   */
  hasura.prototype.FetchRefundRequest = async function (refund_request_id) {
    /**
     * Create a GraphQL query to fetch details or the requested ride
     */
    let query = `
      query ($refund_request_id: uuid!) {
          refund_request: yt_refund_request_by_pk(id: $refund_request_id) {
              id
              refund_amount
              status
              decline_reason
              order {
                  id
                  order_number
                  net_amount
                  status
                  created_at
              }
              requesting_user {
                  id
                  full_name
                  email
                  country_code
                  mobile
                  push_registrations {
                    id
                    token
                    platform
                    provider
                    device_id
                  }
              }
          }
      }
    `;

    /**
     * send request
     */
    let res = await sendRequest({
      query,
      variables: {
        refund_request_id
      }
    });

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched refund request details
     */
    return (res.data && res.data.refund_request) ? res.data.refund_request : null;
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

    // let res = await fetch(HASURA_ENDPOINT, {
    //   method: 'POST',
    //   headers: {
    //     'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    //   },
    //   body: JSON.stringify({
    //     query,
    //     variables: {
    //       objects
    //     }
    //   })
    // }).then(res => res.json());

    // if (res.errors) {
    //   throw new Error(res.errors[0].message);
    // }

    // // console.log(res.data);
    // return {
    //   notifications: res.data['notifications']['returning']
    // };

  }

  return hasura;
}());

module.exports = hasura.bootstrap();