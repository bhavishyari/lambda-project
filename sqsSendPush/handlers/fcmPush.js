'use strict'

var Pushwoosh = require('pushwoosh-client');
var client = new Pushwoosh("D4C03-B0512", "YRg5tdexsiuGdZKJCxNmBo0ObwPO32oy7rZhYmyRccgB2g74Bjb1wVo9ShJe2yBRrZVxRs4m7U88DQhpyuc5", {
  shouldSendToAllDevices: true
});
const fetch = require('node-fetch');
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * fcmPush
 * 
 * @class fcmPush
 */
var fcmPush = (function () {

  /**
   * Initialized a new instance of @fcmPush class.
   */
  function fcmPush() {};

  /**
   * Creates a new @fcmPush instance.
   */
  fcmPush.bootstrap = function () {
    return new fcmPush();
  };

  /**
   * Send mail
   * 
   * @param {String} qMessage
   */
  fcmPush.prototype.execute = async function (qMessage) {
    const msgBody = JSON.parse(qMessage.body);
    let makeObj = {}
    makeObj.content = msgBody.notification.body
    makeObj.title = msgBody.notification.title

    console.log('parsing sqs message body.', msgBody.notification.body);



    if (msgBody.notification.filter) {

      if (msgBody.notification.filter != 'all') {
        makeObj.filter = msgBody.notification.filter
      }
      console.log(makeObj, 'makeobj send to pushwoos')
      client.sendMessage(msgBody.notification.body, makeObj, function (error, response) {
        if (error) {
          console.log('Some error occurs: ', error);
        }

        console.log('Pushwoosh API response is', response);
      });

    } else {
      const userTokens = await getUserTokens(msgBody.userId);
      const badgeCn = await getBadgeCount(msgBody.userId)
      console.log(badgeCn,'badge cn')
      makeObj.ios_badges = badgeCn
      makeObj.android_badge = badgeCn

      console.log(userTokens, 'userTokens')
      if (userTokens[0]) {
        client.sendMessage(msgBody.notification.body, userTokens[0].token, makeObj, function (error, response) {
          if (error) {
            console.log('Some error occurs: ', error);
          }

          console.log('Pushwoosh API response is', response);
        });
      }

    }
  };




  const getUserTokens = async (user_id) => {

    let query = `query ($user_id:uuid!){
        yt_push_registration(where: { user_id : { _eq: $user_id } }){
            id
            device_id
            token
            provider
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
          user_id
        }
      })
    }).then(res => res.json())

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return res.data.yt_push_registration;
  }





  const getBadgeCount = async (user_id) => {

    let query = `query NotificationCount($user_id: uuid!) {
      yt_notification_aggregate(where:
      {_and: [{user_id: {_eq: $user_id}}, {_or: [{content: {_contains: {data: {notification_type: "BOARDING_PASS_EXPIRED"}}}}, {content: {_contains: {data: {notification_type: "NEW_BOARDING_PASS"}}}}]}]}) {
          aggregate {
              count
          }
      }
      yt_notification_read_status_aggregate(where:
      {user_id: {_eq: $user_id}}) {
          aggregate {
              count
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
          user_id
        }
      })
    }).then(res => res.json())

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }


    let notiCount = res.data.yt_notification_aggregate.aggregate.count
    let notiReadCount = res.data.yt_notification_read_status_aggregate.aggregate.count

    return notiCount - notiReadCount;
  }


  return fcmPush;
}());

module.exports = fcmPush.bootstrap();