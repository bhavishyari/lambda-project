const fetch = require('node-fetch');
const { CreateOrder } = require('../common/CreateOrder');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;

module.exports.handler = async event => {
    try {
        const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura action session
         */
        const { user_id, pass_id, new_plan_id, coupon_code } = ValidateInput(body);

        const { pass, new_plan, service } = await GetDetails(pass_id, new_plan_id, Authorization);

        /**
         * Forbid upgrading `EXPIRED` boarding pass
         */
        const valid_to = new Date(pass.valid_to);
        const now = new Date();

        if (valid_to.valueOf() < now.valueOf()) {
            throw new Error('Expired pass can not be upgraded');
        }

        /**
         * Forbid downgrade of Boarding pass
         */
        if (pass.plan.price >= new_plan.price) {
            throw new Error('Boarding Pass can only be upgraded');
        }

        /**
         * Calculate order Gross Amount
         */
        const amount = new_plan.price - pass.plan.price;

        /**
         * Create new order
         */
        const order = await CreateOrder(pass.user_id, user_id, amount, service.id, {
            upgrade_to_plan: new_plan_id,
            boarding_pass_id: pass.id
        }, coupon_code);

        return {
            statusCode: 200,
            body: JSON.stringify({
                order_id: order.id
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

const ValidateInput = body => {
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    const pass_id = body.input.pass_id;

    if (user_role !== 'sales') {
        throw new Error('Boarding pass upgrade can only be initiated by a sales user');
    }

    const new_plan_id = body.input.new_plan_id;
    const coupon_code = body.input.coupon_code || null;

    return {
        user_id,
        user_role,
        pass_id,
        new_plan_id,
        coupon_code
    };
}

/**
 * Fetch details about the boarding pass, new plan to upgrade to, and service used
 * @param {string} pass_id                              the id of the pass to fetch details of
 * @param {string} new_plan_id                          the id of the plan to fetch details of
 * @param {string} Authorization                        the authorization header to use
 * 
 * @returns {PASS_PLAN_AND_SERVICE_DETAILS}             the details about the order
 */
const GetDetails = async (pass_id, new_plan_id, Authorization) => {
    const query = `
        query ($pass_id: uuid! $new_plan_id: uuid!){
            pass: yt_boarding_pass_by_pk(id: $pass_id){
                id
                status
                valid_to
                plan{
                    id
                    title
                    price
                }
                user_id
                order_id
            }
            new_plan: yt_plan_by_pk(id: $new_plan_id) {
                id
                title
                price
            }
            services: yt_service(
                where: { 
                    type: { _eq: "BOARDING_PASS_UPGRADE" }
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
                pass_id,
                new_plan_id
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

    /**
     * Throw if new plan does not exist
     */
    if (!res.data.new_plan) {
        throw new Error('The plan you wish to upgrade to does not exist');
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
        new_plan: res.data.new_plan,
        service
    };
}

/**
 * Type definitions
 */

/**
 * @typedef PLAN
 * @property {string} id                            the id of the plan
 * @property {string} title                         the name of the plan
 * @property {number} price                         the price of the plan
 */

/**
 * @typedef {Object} BOARDING_PASS
 * @property {string} id                            the id of the boarding pass
 * @property {Date} valid_to                        the pass's validity expiry timestamp
 * @property {string} status                        the status of the boarding pass ('ACTIVE' | 'EXPIRED')
 * @property {PLAN} plan                            the plan associated with this boarding pass
 * @property {string} user_id                       the user whose purchased this pass
 * @property {string} order_id                      the id of the order made while purchasing this pass

/**
 * @typedef SERVICE_DETAILS
 * @property {string} id                            the id of the service
 */

/**
 * @typedef {Object} PASS_PLAN_AND_SERVICE_DETAILS
 * @property {BOARDING_PASS} pass
 * @property {PLAN} new_plan
 * @property {SERVICE_DETAILS} service
 */

