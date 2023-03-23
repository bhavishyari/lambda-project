'use strict'

const fetch = require('node-fetch');
const admin = require("firebase-admin");

const validator = require('./validation');
const hasura = require('./hasura');

const FIREBASE_CREDENTIAL_FILE = process.env.FIREBASE_CREDENTIAL_FILE;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

const serviceAccount = require( __dirname + "/../" + FIREBASE_CREDENTIAL_FILE);


/**
 * fcmManager
 * 
 * @class fcmManager
 */
var fcmManager = (function () {

  /**
   * Initialized a new instance of @fcmManager class.
   */
  function fcmManager() { };

  /**
   * Creates a new @fcmManager instance.
   */
  fcmManager.bootstrap = function () {
    return new fcmManager();
  };

  /**
   * Send push notifications
   * 
   * @param {Object} requestBody
   */
  fcmManager.prototype.sendPush = async function (requestBody) {

    let nSetting = await hasura.getNotificationSetting(requestBody.userId);

    let sendPushFlag = true;
    if (nSetting && nSetting.hasOwnProperty('params') && nSetting.params.hasOwnProperty('push')) {
      if (nSetting.params.push === true) {
        sendPushFlag = true;
      } else {
        sendPushFlag = false;
      }
    }

    // Validate msg body
    const errors = validator.fcmPushRequest(requestBody);
    if (errors.length > 0) {

      console.log('invalid msg body: ', JSON.stringify(errors));
      // throw new Error('invalid sqs message body');
    } else if (sendPushFlag === true) {

      const userTokens = await getUserTokens(requestBody.userId, requestBody.platform);

      // prepare push payload
      var pushPayload = [];


      // convert non-string value to string
      let pushData = JSON.stringify(requestBody.data, (k, v) => v && typeof v === 'object' ? v : '' + v);
      // console.log(JSON.parse(pushData));

      userTokens.forEach(utRec => {

        var payload = {
          "token": utRec.token,
          "notification": requestBody.notification,
          "data": JSON.parse(pushData)
        };
        if (requestBody.android) {
          payload['android'] = requestBody.android;
        }
        if (requestBody.webpush) {
          payload['webpush'] = requestBody.webpush;
        }
        // if (requestBody.apns) {
        //   payload['apns'] = requestBody.apns;
        // }
        pushPayload.push(payload);
      });

      if (pushPayload.length > 0) {
        // init app & messaging
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        const messaging = admin.messaging();

        // send messages
        messaging.sendAll(pushPayload, false)
        .then((result) => {
          //console.log('notification sent : ', result);
          /*
          Notification sent :  { responses:
            [ { success: true,
                messageId:
                'projects/yellotaxidemo/messages/0:1594880509614535%32e080d132e080d1' },
              { success: true,
                messageId:
                'projects/yellotaxidemo/messages/0:1594880509614797%32e080d132e080d1' } ],
          successCount: 2,
          failureCount: 0 }
          */
          admin.app().delete();
        })
        .catch((err) => {
          console.log('error : ', err);
          admin.app().delete(); // Release resources
        });
      }

    } else {
      console.log('push notification is disabled by user');
    }
  };

  /**
   * get user device tokens
   * 
   * @param {String} user_id 
   * @param {String} platform
   * 
   * @returns {Array} yt_push_registration records
   */
  const getUserTokens = async (user_id, platform) => {

    let query = `query ($user_id:uuid!, $platform:String!){
        yt_push_registration(where: {
            _and: [
                { user_id : { _eq: $user_id } },
                { platform: { _eq: $platform } }
            ]
        }){
            id
            device_id
            token
            provider
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
          platform
        }
      })
    }).then(res => res.json())

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return res.data.yt_push_registration;
  }


  return fcmManager;
}());

module.exports = fcmManager.bootstrap();
