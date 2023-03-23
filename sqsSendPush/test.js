'use strict'

require('dotenv').config();

/*
const fetch = require('node-fetch');
const admin = require("firebase-admin");

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const FIREBASE_CREDENTIAL_FILE = process.env.FIREBASE_CREDENTIAL_FILE;
const serviceAccount = require(FIREBASE_CREDENTIAL_FILE);

//console.log(HASURA_ENDPOINT);

// init app & messaging
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const messaging = admin.messaging();


// send notifications..
var payload = {
  "token": "fI7bJhM1SvmPy65WWUOJzI:APA91bGlzsD36OUi_9gUV8jWeiad86bZl8QohWTZ7acvoHDbMv05U9b00a2awiQdMve9TT4t3H-ed4LDIWb7NTilBddcWfWsTI7ZvO-7pSfobsak9X9qlWDBWV34RlDY15j6na_LwQGl",
  "notification": {
    "title": "This is title",
    "body": "This is body of message, sent by Rajesh."
  },
  "data": {
    "name": "Rajesh",
    "city": "Rajkot"
  }
};

// var payload1 = {
//   "token": "fI7bJhM1SvmPy65WWUOJzI:APA91bGlzsD36OUi_9gUV8jWeiad86bZl8QohWTZ7acvoHDbMv05U9b00a2awiQdMve9TT4t3H-ed4LDIWb7NTilBddcWfWsTI7ZvO-7pSfobsak9X9qlWDBWV34RlDY15j6na_LwQGl",
//   "notification": {
//     "title": "This is title",
//     "body": "This is body of message, sent by Rajesh."
//   },
//   "data": {
//     "name": "Rajesh",
//     "city": "Rajkot"
//   }
// };


// send single message
// messaging.send(payload)
//   .then((result) => {
//     console.log('Notification sent : ', result);
//   })
//   .catch((err) => {
//     console.log('error : ', err);
//   });


// send multiple message
// messaging.sendAll([payload,payload1])
//   .then((result) => {
//     console.log('Notification sent : ', result);
//   })
//   .catch((err) => {
//     console.log('error : ', err);
//   });


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

  console.log(res.data.yt_push_registration);
  return res.data.yt_push_registration;
}


getUserTokens('2bb003e5-b56b-4b29-9ebd-b6056d590204', 'android');
console.log("END");
*/



const fcmPush = require('./handlers/fcmPush');
const record = {'body': JSON.stringify(
  {
    "userId": "2bb003e5-b56b-4b29-9ebd-b6056d590204",
    "platform": "android",
    "notification": {
      "title": "This is title",
      "body": "This is body of message, sent by Rajesh."
    },
    "data": {
      "name": "Rajesh",
      "city": "Rajkot"
    }
  }
)};

fcmPush.execute(record);
