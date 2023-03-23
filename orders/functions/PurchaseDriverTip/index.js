const fetch = require('node-fetch');
const { CreateOrder } = require('../common/CreateOrder');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const DRIVER_TIP_MIN = process.env.DRIVER_TIP_MIN;  // convert it to USD from cent
const DRIVER_TIP_MAX = process.env.DRIVER_TIP_MAX;  // convert it to USD from cent

module.exports.handler = async event => {

    try {
        // const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * operations
         * - validate input
         * - get ride, pass & service records
         * - validate records
         * - create order record 
         */

        /**
         * Validate input and Hasura action session
         */
        const { user_id, user_role, ride_id, tip_amount } = ValidateInput(body);

        /**
         * Fetch details about the ride and service
         */
        const { ride, service } = await GetDetails(ride_id);

        /**
         * Only rider user can initiate driver tip order
         */
        if (user_role !== 'rider') {
            throw new Error('You are not authorized to create tip order.');
        }

        /**
         * Only rider user can initiate tip order
         */
        if (user_id !== ride.user_id) {
            throw new Error('You are not authorized to create tip order for this ride.');
        }

        /**
         * Create order for purchasing driver tip for boarding pass
         */
        const order = await CreateOrder(ride.user_id, user_id, tip_amount, service.id, {
            purchase_tip_for_ride: ride.id
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                order_id: order.id,
                status: order.status,
                order_number: order.order_number,
                order_details: order
            })
        };
    }
    catch (err) {
        console.log(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
}

/**
 * validate inputs
 * 
 * @param {Object} body 
 */
const ValidateInput = body => {
    /**
     * Get user id and role from Hasura action session variables
     */
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    /**
     * Get the boarding pass id and tip amount from input
     */
    const { ride_id, tip_amount } = body.input;

    /**
     * Check tip_amount constraint (min and max range)
     */

    return {
        user_id,
        user_role,
        ride_id,
        tip_amount
    };
}

/**
 * Fetch ride & service details
 * @param {string} ride_id                              the id of the ride to fetch details of
 * @param {string} Authorization                        the Authorization header
 * 
 * @returns {Promise<PASS_AND_SERVICE_DETAILS>}         the details of the boarding pass
 */
const GetDetails = async (ride_id) => {
    
    const query = `
        query ($ride_id: uuid!){
            ride: yt_ride_by_pk(id: $ride_id){
                id
                user_id
                status
                confirmation_code
                driver {
                    id
                    full_name
                    email
                    active
                    block
                }
            }
            services: yt_service(
                where: {
                    type: { _eq: "DRIVER_TIP" }
                    active: { _eq: true }
                }
            ){
                id
                title
                type
            }
        }
    `;

    /**
     * Run the GraphQL query on Hasura GraphQL engine
     * Use user authorization
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
                ride_id
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    let service = null;
    if (res.data.services.length) {
        service = res.data.services[0];
    } else {
        throw new Error('Order service unknown or inactive.');
    }


    let ride = null;
    if (res.data.ride) {
        ride = res.data.ride;
    } else {
        throw new Error('Ride record not found.');
    }

    /**
     * Else return the fetched boarding pass details
     */
    return {
        ride,
        service
    };
}

/**
 * Type definitions
 */

/**
 * The Boarding Pass object
 * @typedef {Object} BOARDING_PASS
 * @property {string} id                            the id of the boarding pass
 * @property {string} user_id                       the id of the user who purchased the pass
 * @property {string} status                        the status of the boarding pass ('ACTIVE' | 'EXPIRED')
 */

/**
 * @typedef SERVICE
 * @property {string} id                the id of the service
 */

/**
 * @typedef {Object} PASS_AND_SERVICE_DETAILS
 * @property {BOARDING_PASS} pass
 * @property {SERVICE} service
 */