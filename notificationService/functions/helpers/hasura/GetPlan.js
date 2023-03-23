const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch details of a plan
 * @param {string} plan_id the id of the plan to fetch
 * 
 * @returns {Promise<PLAN>} the fetched plan record
 */
module.exports.GetPlan = async plan_id => {
    /**
     * Define a GraphQL query to fetch plan details
     */
    const query = `
        query($plan_id: uuid!){
            plan: yt_plan_by_pk(id: $plan_id){
                id
                title
                description
                price
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
                plan_id
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
     * Throw if plan does not exist
     */
    if (!res.data.plan) {
        throw new Error('Plan with given id does not exist');
    }

    /**
     * Else return the fetched plan details
     */
    return res.data.plan;
}

/**
 * @typedef {Object} PLAN
 * @property {string} id                        the id of the plan record
 * @property {string} title                     the title of the plan
 * @property {string} description               the description of the plan
 * @property {number} price                     the price of the plan
 */