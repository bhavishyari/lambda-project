const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Record successful payment for an order in database
 * @param {RECORD_SUCCESSFUL_PAYMENT_INPUT} data                        the data about the successful payment
 * 
 * @returns {Promise<{order: {id: string}, payment: {id: string}}>}     the updated payment and order record
 */
module.exports.RecordSuccessfulPayment = async (data) => {
    /**
     * Generate GraphQL mutation to update the order and associated payment details
     * 
     * Updated values are
     *  - order
     *      - status                the succussful status of the order ('ORDER_PAID')
     *  - payment
     *      - transaction_data      metadata about the transaction
     *      - transaction_status    the status of the transaction as returned from Stripe ('succeeded')
     *      - status                the successful status of the transaction ('PAYMENT_SUCCESS')
     */
    const query = `
        mutation (
            $order_id: uuid!, 
            $order_status: String!, 
            $payment_id: uuid!, 
            $transaction_data: jsonb!, 
            $payment_status: String!, 
            $transaction_status: String!
        ) {
            order: update_yt_order_by_pk(
                pk_columns: {
                    id: $order_id
                }, 
                _set: {
                    status: $order_status
                }
                ) {
                    id
                }
            payment: update_yt_payment_by_pk(
                pk_columns: {
                    id: $payment_id
                }, 
                _set: {
                    transaction_data: $transaction_data, 
                    status: $payment_status, 
                    transaction_status: $transaction_status
                }
                ) {
                    id
                }
        }
    `;

    /**
     * Run the GraphQl mutation to create new or update the boarding pass
     * 
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
                order_id: data.order.id,
                order_status: 'ORDER_PAID',

                payment_id: data.payment.id,
                transaction_data: data.payment.transaction_data,
                payment_status: 'PAYMENT_SUCCESS',
                transaction_status: data.payment.transaction_status,
            }
        })
    }).then(res => res.json())

    /**
     * throw first error if one occur
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * else return the Hasura response data
     */
    return res.data;
}

/**
 * @typedef {Object} RECORD_SUCCESSFUL_PAYMENT_INPUT
 * @property {Object} order
 * @property {string} order.id
 * 
 * @property {Object} payment
 * @property {string} payment.id
 * @property {string} payment.transaction_status
 * @property {Object} payment.transaction_data
 */