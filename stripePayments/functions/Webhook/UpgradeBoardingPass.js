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
 * Upgrade a Boarding pass to a new plan
 * @param {string} pass_id the id of the boarding pass to upgrade
 * @param {string} new_plan_id the id of the new plan that the pass is being upgraded to
 * @param {string} order_id the id of boarding pass upgrade order
 * @param {string} purchased_at the timestamp at which order payment was received
 * 
 * @returns the upgraded Boarding pass
 */
module.exports.UpgradeBoardingPass = async (pass_id, new_plan_id, order_id, purchased_at) => {
    const plan = await GetPlan(new_plan_id);

    /**
     * Calculate new expiry timestamp
     */
    const valid_from = new Date(purchased_at);
    const validity_ms = plan.validity_days * 86400000;         /* One day contains 8,64,00,000 milliseconds */

    const valid_to = new Date(valid_from.valueOf() + validity_ms);

    /**
     * Generate the boarding pass's type. It can be either one of the following
     *  - UNLIMITED_RIDES   set if plan has unlimited_trips set to TRUE
     *  - AIRPORT_SERVICE   set if plan has only_airport_service set to TRUE
     *  - LIMITED_RIDES     set if none of the above occurs
     */
    let pass_type = 'LIMITED_RIDES';
    if (plan.unlimited_trips) {
        pass_type = 'UNLIMITED_RIDES';
    }
    else if (plan.only_airport_service) {
        pass_type = 'AIRPORT_SERVICE';
    }

    /**
     * the details to update of the Boarding pass
     */
    const update_details = {
        valid_from,
        valid_to, 
        purchased_at,
        pass_type, 
        plan_id: new_plan_id,
        order_id
    }

    return StoreUpgradedPass(pass_id, update_details);
}

/**
 * Update a boarding pass in database with new details
 * @param {string} pass_id                          the id of the boarding pass to update
 * @param {Object} new_details                      the new details to update
 * 
 * @returns {Promise<{id: string}>}                 the updated boarding pass
 */
const StoreUpgradedPass = async (pass_id, new_details) => {
    const query = `
        mutation ($pass_id: uuid!, $new_details: yt_boarding_pass_set_input!) {
            update_result: update_yt_boarding_pass_by_pk(
                pk_columns:{
                    id: $pass_id
                }
                _set: $new_details
            ){
                id
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
                pass_id,
                new_details
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res.data.update_result;
}