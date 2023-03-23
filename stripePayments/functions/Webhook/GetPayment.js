const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Get the details of payment corresponding to a transaction id
 * @param {String} transaction_id           the id of the payment intent
 * 
 * @returns {Promise<PAYMENT>}              the fetched payment record
 */
module.exports.GetPayment = async transaction_id => {
    /**
     * Generate the GraphQL query for fetching the Payment record details
     * Details fetched are
     *  - id
     *  - amount
     *  - order
     *      - id
     *      - user_id
     *      - status
     *      - created_by
     *      - service
     *          - type
     *      - service_details
     *      - commission_details
     *  - status
     *  - transaction_status
     *  - transaction_data
     */
    let query = `
        query ($transaction_id: String!) {
            payments: yt_payment(where: {
                transaction_id: {_eq: $transaction_id}
            }) {
                id
                amount
                order {
                    id
                    user_id
                    status
                    created_by
                    service {
                        type
                    }
                    service_details
                    commission_details
                }
                status
                transaction_id
                transaction_status
                transaction_data
            }
        }      
    `;

    /**
     * Run the GraphQl mutation to create new or update the boarding pass
     * Uses the HASURA_ADMIN_SECRET variable to authorize with Hasura as admin role
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
                transaction_id
            }
        })
    }).then(res => res.json());

    /**
     * throw first error if one occur
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if(!res.data.payments.length){
        throw new Error('Payment with given id not found');
    }

    return res.data.payments[0];
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} PAYMENT
 * @property {string} id
 * @property {number} amount
 * @property {ORDER} order
 * @property {string} status
 * @property {string} transaction_id
 * @property {string} transaction_status
 * @property {Object} transaction_data
 */

/**
 * @typedef {Object} ORDER
 * @property {string} id
 * @property {string} user_id
 * @property {string} status
 * @property {string} created_by
 * @property {SERVICE} service
 * @property {SERVICE_DETAILS} service_details
 */

/**
 * @typedef {Object} SERVICE
 * @property {string} type
 */

/**
 * @typedef {Object} SERVICE_DETAILS
 * @property {string?} purchase_plan                    the plan being purchased by the order
 * @property {string?} boarding_pass_id                 the boarding pass to update / upgrade after order payment completes
 * @property {string?} upgrade_to_plan                  the plan to upgrade to for the boarding pass
 * @property {number?} extend_by_days                   the number of days to extend for the boarding pass
 */