const fetch = require('node-fetch');
const { GetRide } = require('./GetRide');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Create a new driver tip
 * 
 * @param {string} payment_id   the id of the payment
 * @param {number} amount       the amount of payment transaction
 * @param {string} ride_id      the id of the ride which is related to tip order
 * @param {string} order_id     the id of the order made to purchase the pass
 * 
 * @returns the created user wallet record
 */
module.exports.CreateDriverTip = async (payment_id, amount, ride_id, order_id) => {

    // console.log('UpdateServices : purchase_tip_for_ride : CreateDriverTip');

    const ride = await GetRide(ride_id);

    /**
     * @type {USER_WALLET}
     */
    const tip_details = {
        user_id: ride.driver_user_id,
        order_id: order_id,
        ride_id: ride.id,
        ride_distance: ride.distance,
        ride_duration: ride.duration,
        payment_id: payment_id,
        amount: amount,
        context: 'TIP',
        type: 'C'
    };

    return StoreTip(tip_details);
}


/**
 * Store a user wallet record to database
 * 
 * @param {USER_WALLET} tip_details                 the details of the user wallet to store
 * 
 * @returns {Promise<{id: string}>}                 the newly stored user wallet record
 */
const StoreTip = async tip_details => {

    // console.log('UpdateServices : purchase_tip_for_ride : StoreTip');

    /**
     * Define a GraphQL mutation to store a tip in user wallet
     */
    const query = `
        mutation($tip_details: yt_user_wallet_insert_input!){
            user_wallet: insert_yt_user_wallet_one(object: $tip_details){
                id
            }
        }
    `;

    /**
     * Run the mutation on Yello Taxi's Hasura engine
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                tip_details 
            }
        })
    }).then(res => res.json())

    /**
     * Throw if any error occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    console.log('UpdateServices : purchase_tip_for_ride : StoreTip : done : user_wallet : ', res.data.user_wallet);

    /**
     * Else return the newly created record
     */
    return res.data.user_wallet;
}


/**
 * Type definitions
 */

/**
 * @typedef {Object} USER_WALLET
 * @property {string} user_id
 * @property {string} order_id
 * @property {string} payment_id
 * @property {numeric} amount
 * @property {string} context
 * @property {string} type
 */
