const fetch = require('node-fetch');
const { CreateOrder } = require('../common/CreateOrder');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;

module.exports.handler = async event => {
    //remove this by nafees
    try {
        const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura action session
         */
        const { user_id, pass_id, extend_by_days, coupon_code } = ValidateInput(body);

        /**
         * Fetch details about the boarding pass to extend, and the service used
         */
        const { pass, service } = await GetDetails(pass_id, Authorization);

        /**
         * Forbid extending `EXPIRED` boarding pass
         */
        const valid_to = new Date(pass.valid_to);
        const now = new Date();
        if (valid_to.valueOf() < now.valueOf()) {
            throw new Error('Boarding Pass has already expired.');
        }

        /**
         * Generate the extension price field name
         */
        const extension_price_field = `extension_price_${extend_by_days}_day`;

        /**
         * Extension price is stored in fields like `plan.extension_price_1_day`
         */
        const amount = pass.plan[extension_price_field];

        /**
         * Create an order for extending the boarding pass
         */
        const order = await CreateOrder(pass.user_id, user_id, amount, service.id,
            {
                boarding_pass_plan_id: pass.plan_id,
                boarding_pass_id: pass.id,
                extend_by_days
            },
            coupon_code);

        return {
            statusCode: 200,
            body: JSON.stringify({
                order_id: order.id,
                status: order.status,
                order_number: order.order_number,
                order_details: order
            })
        }
    } catch (err) {
        console.log(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * Validate request body
 * 
 * @param {Object} body 
 */
const ValidateInput = body => {
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    const pass_id = body.input.pass_id;

    if ( !['rider', 'driver', 'sales'].includes(user_role)) {
        throw new Error('Boarding pass extension can only be initiated by a rider, driver or sales user.');
    }

    /**
     * The number of days to extend the pass
     * @type {number}
     */
    let extend_by_days = body.input.extend_by_days;

    const coupon_code = body.input.coupon_code || null;

    /**
     * Abort if trying to extend the pass by less than 1 day or more than 3 days
     */
    if (extend_by_days < 1 || extend_by_days > 3) {
        throw new Error('Pass can only be extended by 1-3 days.');
    }

    return {
        user_id,
        user_role,
        pass_id,
        coupon_code,
        extend_by_days
    };
}

/**
 * Fetch details about a boarding pass
 * @param {string} pass_id                              the id of the pass to fetch details of
 * @param {string} Authorization                        the authorization header to use
 * 
 * @returns {Promise<PASS_AND_SERVICE_DETAILS>}         the details of the boarding pass
 */
const GetDetails = async (pass_id, Authorization) => {
    /**
     * Define the graphQL query to fetch boarding pass details
     * Details fetched are
     *  - id
     *  - valid_to
     *  - status
     *  - plan
     *      - id
     *      - title
     *      - price
     *      - extension_price_1_day
     *      - extension_price_2_day
     *      - extension_price_3_day
     *  - user_id
     *  - order_id
     */
    const query = `
        query ($pass_id: uuid!){
            pass: yt_boarding_pass_by_pk(id: $pass_id){
                id
                status
                valid_to
                plan{
                    id
                    title
                    price
                    extension_price_1_day
                    extension_price_2_day
                    extension_price_3_day
                }
                user_id
                order_id
            }
            services: yt_service(
                where: {
                    type: { _eq: "BOARDING_PASS_EXTENSION" }
                    active: { _eq: true }
                }
            ){
                id
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
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                pass_id
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw error if boarding pass does not exist
     */
    if (!res.data.pass) {
        throw new Error('Boarding pass with the given id does not exist');
    }

    let service = null;
    if (res.data.services.length) {
        service = res.data.services[0];
    }
    else {
        throw new Error('Order service unknown or inactive.');
    }

    /**
     * Else return the fetched boarding pass details
     */
    return {
        pass: res.data.pass,
        service
    };
}

/**
 * Type definitions
 */

/**
 * The Plan object
 * @typedef {Object} PLAN
 * @property {string} id                            the id of the plan
 * @property {string} title                         the name of the plan
 * @property {number} price                         the amount required to purchase the plan
 * @property {number} extension_price_1_day         the amount required to extend the plan by 1 day
 * @property {number} extension_price_2_day         the amount required to extend the plan by 2 day
 * @property {number} extension_price_3_day         the amount required to extend the plan by 3 day
 */

/**
 * The Boarding Pass object
 * @typedef {Object} BOARDING_PASS
 * @property {string} id                            the id of the boarding pass
 * @property {Date} valid_to                        the pass's validity expiry timestamp
 * @property {string} status                        the status of the boarding pass ('ACTIVE' | 'EXPIRED')
 * @property {PLAN} plan                            the plan associated with this boarding pass
 * @property {string} user_id                       the user whose purchased this pass
 * @property {string} order_id                      the id of the order made while purchasing this pass
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