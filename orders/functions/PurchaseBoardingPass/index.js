const fetch = require('node-fetch');
const { CreateOrder } = require('../common/CreateOrder');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET           the hasura admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {
    try {

        // const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura Action session variables
         */
        const { 
            user_id, 
            on_behalf_of_user_id, 
            plan_id, 
            coupon_code, 
            add_commission } = ValidateInput(body);

        /**
         * Get details about the plan being purchased
         */
        const { plan, service } = await GetDetails(plan_id);

        let commission = {};
        if (add_commission && plan.sales_commission) {

            commission = {
                to_user_id: user_id,
                percentage: plan.sales_commission,
                plan_id: plan.id,
                plan_validity_days: plan.validity_days
            };

        }

        /**
         * Create a new order based on details
         */
        const order = await CreateOrder(on_behalf_of_user_id, user_id, plan.price, 
            service.id, { purchase_plan: plan_id }, coupon_code, commission);

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
        }
    }
}

/**
 * validate inputs
 * 
 * @param {Object} body 
 */
const ValidateInput = body => {
    console.log(body.session_variables,'body.session_variables');
    
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    const plan_id = body.input.plan_id;
    let on_behalf_of_user_id = body.input.on_behalf_of_user_id;
    let add_commission = false;
    const coupon_code = body.input.coupon_code || null;

    if (user_role === 'driver' || user_role === 'sales') {
        if (!on_behalf_of_user_id) {
            throw new Error('Sales or Driver user must provide a valid `on_behalf_of_user_id`')
        }
        add_commission = true;
    }
    else {
        on_behalf_of_user_id = user_id;
    }

    return {
        user_id,
        user_role,
        plan_id,
        coupon_code,
        on_behalf_of_user_id,
        add_commission
    };
}

/**
 * Fetch details of a plan
 * @param {string} plan_id                         the id of the plan to fetch details of
 * 
 * @returns {Promise<PLAN_AND_SERVICE_DETAILS>}    the plan details
 */
const GetDetails = async (plan_id) => {
    /**
     * Define a GraphQL query to fetch plan details
     * Details fetched are
     * plan
     *  - id
     *  - title
     *  - price
     *  - sales_commission
     *  - validity_days
     * services
     *  - id
     */
    const query = `
        query($plan_id: uuid!){
            plan: yt_plan_by_pk(id:$plan_id){
                id
                title
                price
                sales_commission
                validity_days
            }
            services: yt_service(
                where: {
                    type: { _eq: "BOARDING_PASS" }
                    active: { _eq: true }
                }
            ){
                id
            }
        }
    `;

    /**
     * Run the query in Yello Taxi's Hasura GraphQL engine
     * Use user hasura admin secret
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
                plan_id
            }
        })
    }).then(res => res.json())

    /**
     * Throw error if it occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw error if plan does not exist
     */
    if (!res.data.plan) {
        throw new Error('Plan with given id does not exist');
    }

    let service = null;
    if (res.data.services.length) {
        service = res.data.services[0];
    }
    else {
        throw new Error('Order service unknown or inactive.');
    }

    /**
     * Else return the fetched plan details
     */
    return {
        plan: res.data.plan,
        service
    };
}

/**
 * Type definitions
 */

/**
 * @typedef PLAN_DETAILS
 * @property {string} id                the id of the plan
 * @property {string} title             the name of the plan
 * @property {number} price             the price of the plan
 */

/**
 * @typedef SERVICE_DETAILS
 * @property {string} id                the id of the service
 */

/**
 * @typedef {Object} PLAN_AND_SERVICE_DETAILS
 * @property {PLAN_DETAILS} plan
 * @property {SERVICE_DETAILS} service
 */