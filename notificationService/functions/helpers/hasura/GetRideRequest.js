const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch a ride request details
 * @param {string} ride_request_id the id of the ride request to fetch
 * 
 * @returns {Promise<RIDE_REQUEST>} the ride request record
 */
module.exports.GetRideRequest = async ride_request_id => {
    /**
     * Create a GraphQL query to fetch details or the requested ride
     */
    const query = `
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
                }
                driver {
                    id
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
    * Run the GraphQL query on the Hasura instance
    * Use admin secret to authorize
    */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                ride_request_id
            }
        })
    }).then(res => res.json())

    /**
    * Throw the first error if occurs
    */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if ride request not found
     */
    if(!res.data.ride_request){
        throw new Error('Ride request with given id not found');
    }

    /**
    * Else return the fetched ride request details
    */
    return res.data.ride_request;
}

/**
 * @typedef {Object} RIDE_REQUEST
 * @property {string} id                        the id of the request record
 * @property {number} eta_number                the eta value
 * @property {string} eta_unit                  the unit in which eta_number is described
 * @property {RIDE_REQUEST_USER} rider          the rider who started the request
 * @property {RIDE_REQUEST_USER} driver         the driver to which the request is sent
 * @property {RIDE} ride                        the ride details
 */

/**
 * @typedef {Object} RIDE_REQUEST_USER
 * @property {string} id                        the id of the rider (user) record
 * @property {string} full_name                 the full name of the rider
 * @property {string} country_code              the country code of rider's phone
 * @property {string} mobile                    the rider's phone number
 * @property {string} email                     the rider's email address
 */
