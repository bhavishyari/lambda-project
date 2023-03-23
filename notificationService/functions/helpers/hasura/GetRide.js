const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch details of a ride
 * @param {string} ride_id the id of the ride record to fetch
 * 
 * @returns {Promise<RIDE>} the fetched ride details
 */
module.exports.GetRide = async ride_id => {
    /**
     * Define the GraphQL query to fetch ride details
     */
    const query = `
        query($ride_id: uuid!){
            ride: yt_ride_by_pk(id: $ride_id){
                id
                driver {
                    id
                    full_name
                    email
                    country_code
                    mobile
                }
                rider {
                    id
                    full_name
                    email
                    country_code
                    mobile
                }
                cancelled_by{
                    full_name
                    type
                }
            }
        }
    `;

    /**
     * Run the GraphQL query in Hasura instance
     * Use admin secret to authorize
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
                ride_id
            }
        })
    }).then(res => res.json());

    /**
     * Throw the first error if occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if ride does not exist
     */
    if(!res.data.ride){
        throw new Error('Ride with the given id does not exist');
    }

    /**
     * Else return the fetched ride details
     */
    return res.data.ride;
}

/**
 * @typedef {Object} RIDE
 * @property {string} id                        the id of the ride record
 * @property {RIDE_USER} rider                  the rider of the ride
 * @property {RIDE_USER} driver                 the driver of the ride
 * @property {RIDE_CANCELLED_BY} cancelled_by   the user (driver or rider) who cancelled the ride
 */

/**
 * @typedef {Object} RIDE_USER
 * @property {string} id                        the id of the rider (user) record
 * @property {string} full_name                 the full name of the rider
 * @property {string} country_code              the country code of rider's phone
 * @property {string} mobile                    the rider's phone number
 * @property {string} email                     the rider's email address
 */

/**
 * @typedef {Object} RIDE_CANCELLED_BY
 * @property {string} full_name                 the full name of the user who cancelled the ride
 * @property {string} type                      the type of the user ('rider' | 'driver')
 */