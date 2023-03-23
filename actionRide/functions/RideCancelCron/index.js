'use strict'
const fetch = require('node-fetch');
const theMoment = require('moment');

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
module.exports.handler = async event => {
  let data = await getRideListForCancel()
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    },
    body: JSON.stringify(data)
  }
}

const getRideListForCancel = async function () {

  let current_time = theMoment.utc().toISOString();


  let current_n = theMoment.utc();
  current_n.subtract({
    minutes: 2
  });

  current_n.toISOString;

  console.log(current_n, "current_n");

  console.log(current_time, "current_time");

  let query = `mutation MyMutation ($current_n:timestamp!,$current_time:timestamp!) {           
      update_yt_ride(where: {created_at: {_lt: $current_n}, status: {_eq: "NEW"}}, _set: {status: "CANCELED",cancelled_at:$current_time,cancellation_reason:"Automatic Cancelled"}) {
        affected_rows
        returning {
          id
          created_at
          status
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
        current_n,
        current_time
      }
    })
  }).then(res => res.json());

  if (res.errors) {
    throw new Error(res.errors[0].message);
  }


  console.log(res.data.update_yt_ride, 'res.data.update_yt_ride')

  if (res.data.update_yt_ride) {

    for (let v in res.data.update_yt_ride.returning) {
      let ride_id = res.data.update_yt_ride.returning[v].id
      console.log(ride_id, '..........ssride.id')


      let query2 = `mutation MyMutation($ride_id:String!) {
          update_yt_vehicle(where:{is_request:{_eq: $ride_id}}, _set: {is_request:"a"}) {
            affected_rows
          }
        }`;

      console.log(query2, '..........ssride.id')
      let res2 = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
          query: query2,
          variables: {
            ride_id
          }
        })
      }).then(res2 => res2.json());
      console.log(res2, '..........res2')

      if (res2.errors) {
        throw new Error(res2.errors[0].message);
      }

    }
  }

  return res
}