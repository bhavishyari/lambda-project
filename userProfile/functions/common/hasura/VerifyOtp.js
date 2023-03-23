'use strict'

const fetch = require('node-fetch');
const theMoment = require('moment');
const AWS = require('aws-sdk');
const SQS = new AWS.SQS({
  apiVersion: '2012-11-05'
});

/**
 * Load the required values from ENVIRONMENT
 *  - HASURA_ENDPOINT           the public endpoint for our Hasura instance
 *  - HASURA_ADMIN_SECRET       the admin secret for HASURA
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * VerifyOtp
 * 
 * @class VerifyOtp
 */
var VerifyOtp = (function () {

  /**
   * Initialized a new instance of @VerifyOtp class.
   */
  function VerifyOtp() { };

  /**
   * Creates a new @VerifyOtp instance.
   */
  VerifyOtp.bootstrap = function () {
    return new VerifyOtp();
  };


  /**
   * Verify OTP
   * 
   * @param {String} mobile       the mobile number
   * @param {String} code         the otp code
   * @param {String} secret       the otp code secret
   * 
   * @returns Promise
   */
  VerifyOtp.prototype.execute = async function (mobile, code, secret) {

    let user_otp = await getUserOtp(secret, mobile);
    if (!user_otp) {
      throw new Error('Verification code not found.');
    }

    let validFromUtc = theMoment.utc(user_otp.valid_from).toISOString();
    let nowUtc = theMoment().utc().toISOString();
    let validToUtc = theMoment.utc(user_otp.valid_to).toISOString();

    if (user_otp.code !== code) {
      throw new Error("Verification code is not valid.");
    } else if (user_otp.used_at !== null) {
      throw new Error("Verification code is already used.");
    } else if (theMoment(nowUtc).isAfter(validFromUtc) === false) {
      throw new Error("Verification code validity is not started yet.");
    } else if (theMoment(nowUtc).isBefore(validToUtc) === false) {
      throw new Error("Verification code is expired.");
    }
    
    return user_otp;
  };


  /**
   * Get user_otp
   * 
   * @param {String} secret     the secret of OTP
   * @param {String} mobile     the mobile number
   */
  const getUserOtp = async (secret, mobile) => {

    let query = `
          query GetUserOtp($secret:uuid!, $mobile:String!) {
            user_otp: yt_user_otp(
              where: {
                secret: {_eq: $secret},
                mobile: {_eq: $mobile}
              }) {
              id
              code
              country_code
              mobile
              secret
              updated_at
              created_at
              used_at
              valid_from
              valid_to
            }
          }
    `;

    /**
     * Run the GraphQL mutation on the Hasura instance
     * Use admin secret to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
              secret,
              mobile
            }
        })
    }).then(res => res.json());

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    // {
    //   "data": {
    //     "user_otp": [
    //       {
    //         "code": "778126",
    //         "country_code": "+91",
    //         "mobile": "9904032335",
    //         "created_at": "2020-10-22T14:07:49.294743+00:00",
    //         "id": "9ab430b7-6efe-44c0-8694-e607eec52d2f",
    //         "secret": "4c59d391-da09-45fc-bf94-1f826ec0624e",
    //         "updated_at": "2020-10-22T14:07:49.294743+00:00",
    //         "used_at": null,
    //         "valid_from": "2020-10-22T14:07:49.294743",
    //         "valid_to": "2020-10-22T14:17:49.294743"
    //       }
    //     ]
    //   }
    // }

    /**
     * Else return the found users
     */
    return (res.data.user_otp[0]) ? res.data.user_otp[0] : null;
  }

  return VerifyOtp;
}());

module.exports = VerifyOtp.bootstrap();
