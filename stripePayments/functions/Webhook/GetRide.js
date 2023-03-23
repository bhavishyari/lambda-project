const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Get details of a ride
 * 
 * @param {string} ride_id                  the id of the ride to fetch details of
 * 
 * @returns {Promise<RIDE>}                 the fetched ride record
 */
module.exports.GetRide = async ride_id => {


    // console.log('UpdateServices : purchase_tip_for_ride : GetRide');

    const query = `
        query($ride_id: uuid!){
            ride: yt_ride_by_pk(id: $ride_id){
                id
                driver_user_id
                distance
                duration
            }
        }
    `;

    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                ride_id
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.ride) {
        throw new Error('Ride with given id not found');
    }

    return res.data.ride;
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} RIDE
 * @property {string} id
 * @property {number} driver_user_id
 * @property {number} distance
 * @property {number} duration
 */
