'use strict'
const fetch = require('node-fetch');
const theMoment = require('moment');

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
module.exports.handler = async event => {
  let data = await releaseVehicle()
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    },
    body: JSON.stringify(data)
  }
}

const releaseVehicle = async function () {


  let current_n = theMoment.utc();
  current_n.subtract({
    hours: 24
  });

  current_n.toISOString;

  console.log(current_n, "current_n");

  let query = `query MyQuery($current_n:timestamp) {
   yt_ride(where: {status: {_nin: ["ASSIGNED", "IN_PROGRESS"]}, created_at: {_gt: $current_n}}, order_by: {created_at: desc, vehicle_id: desc_nulls_first}, distinct_on: vehicle_id) {
    id
    status
    vehicle_id
    created_at
    vehicle{
    booked
    }
  }
}
`;

  let res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({
      query,
      variables: {
        current_n
      }
    })
  }).then(res => res.json());

  if (res.errors) {
    throw new Error(res.errors[0].message);
  }

  if (res.data.yt_ride) {
    res.data.yt_ride.map(async (ride) => {
      //console.log(ride.vehicle,'ride.vehicle')
      if (ride.vehicle && ride.vehicle.booked) {

        let query = `mutation MyMutation($ride_id:uuid!) {
      update_yt_vehicle_by_pk(pk_columns: {id: $ride_id}, _set: {booked: false,is_request:"a"}) {
        id
      }
}`;

        let res3 = await fetch(HASURA_ENDPOINT, {
          method: 'POST',
          headers: {
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query,
            variables: {
              ride_id: ride.vehicle_id
            }

          })
        }).then(res3 => res3.json());


        console.log(res3, 'res3')
      } else {
        console.log('no vehicle')

      }
    })
  }

  return res
}