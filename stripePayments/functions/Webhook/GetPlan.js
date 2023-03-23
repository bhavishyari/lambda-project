const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Get details of a plan
 * @param {string} plan_id                  the id of the plan to fetch details of
 * 
 * @returns {Promise<PLAN>}                 the fetched plan record
 */
module.exports.GetPlan = async plan_id => {
    const query = `
        query($plan_id: uuid!){
            plan: yt_plan_by_pk(id: $plan_id){
                id
                price
                validity_days
                only_airport_service
                unlimited_trips
                total_trips
                total_daily_trips
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
                plan_id
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.plan) {
        throw new Error('Plan with given id not found');
    }

    return res.data.plan;
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} PLAN
 * @property {string} id
 * @property {number} price
 * @property {number} validity_days
 * @property {boolean} only_airport_service
 * @property {boolean} unlimited_trips
 * @property {number} total_trips
 * @property {number} total_daily_trips
 */