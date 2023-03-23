const fetch = require('node-fetch');
const { GetPlan } = require('./GetPlan');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Create a new boarding pass for a user
 * @param {Object} order the order record
 * @param {string} payment_id the id of the payment record
 * @param {Number} payment_amount the payment amount
 * @param {Date} purchased_at the timestamp at which the pass is purchased
 * 
 * @returns the created boarding pass
 */
module.exports.CreateBoardingPass = async (order, payment_id, payment_amount, purchased_at) => {

    let user_id = order.user_id;
    let order_id = order.id;
    let plan_id = order.service_details.purchase_plan
    let commission = order.commission_details

    const plan = await GetPlan(plan_id);

    /**
     * @type {BOARDING_PASS_DETAILS}
     */
    const pass_details = {
        user_id,
        order_id,
        plan_id,
        purchased_at,
        //valid_from: purchased_at,
        status: 'ACTIVE',
        total_trips: plan.total_trips,
        total_daily_trips: plan.total_daily_trips,
        only_airport_service: plan.only_airport_service,
        unlimited_trips: plan.unlimited_trips
    };

    // NOTE: valid_from & valid_to will be set while first ride book
    
    // /**
    //  * Calculate boarding pass's expiry timestamp
    //  * (1 day contains 24 * 60 * 60 * 1000 = 8,64,00,000 milliseconds)
    //  */
    // const validity_ms = plan.validity_days * 86400000;
    // pass_details.valid_to = new Date(purchased_at.valueOf() + validity_ms);

    /**
     * Generate the boarding pass's type. It can be either one of the following
     *  - UNLIMITED_RIDES   set if plan has unlimited_trips set to TRUE
     *  - AIRPORT_SERVICE   set if plan has only_airport_service set to TRUE
     *  - LIMITED_RIDES     set if none of the above occurs
     */
    if (plan.unlimited_trips) {
        pass_details.pass_type = 'UNLIMITED_RIDES';
    }
    else if (plan.only_airport_service) {
        pass_details.pass_type = 'AIRPORT_SERVICE';
    }
    else {
        pass_details.pass_type = 'LIMITED_RIDES';
    }

    // prepare commission details
    let commission_details = null;
    if (commission && commission.to_user_id && commission.percentage) {
        /**
         * type {USER_WALLET_DETAILS}
         */
        commission_details = {
            user_id: commission.to_user_id,
            order_id: order_id,
            payment_id: payment_id,
            plan_id: (commission.plan_id) ? commission.plan_id : null,
            plan_validity_days: (commission.plan_validity_days) ? commission.plan_validity_days : null,
            amount: (payment_amount * commission.percentage) / 100,
            context: 'COMMISSION',
            type: 'C'
        };
    }

    return StoreBoardingPass(pass_details, commission_details);
}

/**
 * Store a boarding pass record to database
 * @param {BOARDING_PASS_DETAILS} pass_details              the details of the boarding pass to store
 * @param {USER_WALLET_DETAILS} commission_details                       the details of commission record to store
 * 
 * @returns {Promise<{id: string}>}                         the newly stored boarding pass
 */
const StoreBoardingPass = async (pass_details, commission_details = null) => {
    
    if (pass_details && commission_details) {

        /**
         * Define a GraphQL mutation to store a boarding pass and commission
         */
        var query = `

            mutation($pass_details: yt_boarding_pass_insert_input!, $commission_details: yt_user_wallet_insert_input!){

                boarding_pass: insert_yt_boarding_pass_one(object: $pass_details){
                    id
                }

                user_wallet: insert_yt_user_wallet_one(object: $commission_details){
                    id
                }

            }
        `;
        var variables = {
            pass_details,
            commission_details
        };
    } else {

        /**
         * Define a GraphQL mutation to store a boarding pass 
         */
        var query = `
            mutation($pass_details: yt_boarding_pass_insert_input!){
                boarding_pass: insert_yt_boarding_pass_one(object: $pass_details){
                    id
                }
            }
        `;
        var variables = {
            pass_details 
        };
    }

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
            variables: variables
        })
    }).then(res => res.json())

    /**
     * Throw if any error occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly stored boarding pass
     */
    return res.data.boarding_pass;
}


/**
 * Type definitions
 */

/**
 * @typedef {Object} BOARDING_PASS_DETAILS
 * @property {String} user_id
 * @property {String} plan_id
 * @property {String} order_id
 * @property {String} pass_type
 * @property {Date} purchased_at
 * @property {Date} valid_from
 * @property {Date} valid_to
 * @property {String} status
 */

 /**
 * @typedef {Object} USER_WALLET_DETAILS
 * @property {String} user_id
 * @property {String} order_id
 * @property {String} payment_id
 * @property {Number} payment_amount
 * @property {String} context
 * @property {String} type
 */
