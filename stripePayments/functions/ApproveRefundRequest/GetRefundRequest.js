const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET   the admin secret set on the Hasura instance
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch the refund request record
 * @param {String} refund_request_id        the id of the refund request record to fetch
 * 
 * @returns {Promise<REFUND_REQUEST>}       the fetched refund request record
 */
module.exports.GetRefundRequest = async (refund_request_id) => {
    /**
     * Define a GraphQL query to fetch the order details from refund request
     * Details fetched are
     *  - id                            the id of the refund request record
     *  - refund_amount                 the amount requested for refund
     *  - order
     *      - id                        the id of the order
     *      - user_id                   the user who made the order
     *      - net_amount                the net amount of the order
     *      - status                    the current status of the order
     *      - payments                  the payment(s) received for this order
     *          - id                    the id of the payment record
     *          - transaction_id        the id of the transaction
     *          - transaction_status    the status of the transaction
     *          - amount                the amount of the transaction
     */
    let query = `
        query ($refund_request_id: uuid!) {
            refund_request: yt_refund_request_by_pk(id: $refund_request_id){
                id   
                refund_amount  
                status           
                order {
                    id
                    user_id
                    net_amount
                    status

                    payments(where: { type: {_eq: "C"} }){
                        id
                        transaction_id
                        transaction_status
                        amount
                    }

                    user_wallets(where: { context: {_eq: "COMMISSION"}, type: {_eq: "C"} } ) {
                        id
                        user_id
                        order_id
                        payment_id
                        amount
                        context
                        type
                        plan_id
                        plan_validity_days
                    }
                }
            }
        }                    
    `;

    /**
     * Run the GraphQL mutation on the Hasura instance
     * Use admin secret to authorize
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
                refund_request_id
            }
        })
    }).then(res => res.json())

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the refund request record
     */
    return res.data.refund_request;
}

/**
 * Type definitions
 */

/**
 * The Refund request record object
 * @typedef {Object} REFUND_REQUEST
 * @property {string} id                                    the id of the refund request
 * @property {number} refund_amount                         the amount requested for refund
 * @property {ORDER} order                                  the order for which this refund request has been created
 */

/**
 * The Payment Object
 * @typedef {Object} PAYMENT
 * @property {string} id                                    the id of the payment record
 * @property {string} transaction_id                        the id of the transaction
 * @property {string} transaction_status                    the status of the transaction
 * @property {number} amount                                the amount of the transaction
 */


/**
 * The Order object
 * @typedef {Object} ORDER
 * @property {string} id                                    the id of the order record
 * @property {string} user_id                               the id of the user who made this order
 * @property {number} net_amount                            the net amount of the order
 * @property {string} status                                the current status of the order
 * @property {PAYMENT[]} payments                           the payment(s) received for this order
 */