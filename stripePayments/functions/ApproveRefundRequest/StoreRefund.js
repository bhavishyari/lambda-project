const fetch = require('node-fetch');
const stripe = require('stripe');
const uuidV4 = require('uuid').v4;

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET   the admin secret set on the Hasura instance
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Stores the refund payment details
 * @param {string} refund_request_id            the id of the refund_request to update
 * @param {string} user_id                      the id of the user who created this order
 * @param {string} order_id                     the id of the order for which this refund is initiated
 * @param {stripe.Stripe.Refund} refund         the stripe returned refund object
 * @param {number} refund_amount                the amount to refund
 * @param {number} commission_amount            the commission amount to debit from user wallet
 * 
 * @returns {Promise<{
 * refund_request:{id: string}, 
 * refund: {id: string} 
 * order: {id: string}
 * }>}                                  the newly created/updated records
 */
module.exports.StoreRefund = async (refund_request_id, user_id, order_id, refund, refund_amount, commission_amount) => {

    
    // Generate payment record id
    const payment_id = uuidV4();

    // Create a payment record to store
    const payment = {
        id: payment_id,
        user_id: user_id,
        created_by: user_id,
        order_id: order_id,
        amount: refund_amount,
        status: 'PAYMENT_INITIATED',
        transaction_id: refund.id,
        transaction_status: refund.status,
        transaction_data: {
            created: new Date(refund.created * 1000),
            currency: refund.currency,
            refund_reason: refund.reason,
            refund_request_id: refund_request_id
        },
        payment_gateway: 'STRIPE',
        payment_method: 'card',
        type: 'D'
    };


    // Define a GraphQL mutation to insert a new payment record for the refund
    let query = '';
    let variables = {};

    if (commission_amount === 0) {

        query = `
        mutation ($payment:yt_payment_insert_input!, $refund_request_id: uuid!, $order_id: uuid!, $refund_amount: float8!) {

            refund: insert_yt_payment_one(object: $payment) {
                id
            }

            refund_request: update_yt_refund_request_by_pk(
                pk_columns:{ id:$refund_request_id }
                _set:{
                    status: "APPROVED",
                    refund_amount: $refund_amount
                }
            ){
                id
            }

            order: update_yt_order_by_pk(
                pk_columns:{id: $order_id}
                _set:{
                    status: "REFUND_INITIATED"
                }
            ){
                id
            }
        }
        `;

        variables = {
            refund_request_id: refund_request_id,
            order_id: order_id,
            payment: payment,
            refund_amount: refund_amount
        };

    } else {

        // Create a wallet debit record
        const user_wallet = {
            user_id: user_id,
            payment_id: payment_id,
            amount: commission_amount,      // total from commission record.
            context: "COMMISSION",
            type: "D"
        };


        query = `
        mutation ($payment:yt_payment_insert_input!, $refund_request_id: uuid!, $order_id: uuid!, $refund_amount: float8!, $user_wallet:yt_user_wallet_insert_input!) {

            refund: insert_yt_payment_one(object: $payment) {
                id
            }

            refund_request: update_yt_refund_request_by_pk(
                pk_columns:{ id:$refund_request_id }
                _set:{
                    status: "APPROVED",
                    refund_amount: $refund_amount
                }
            ){
                id
            }

            order: update_yt_order_by_pk(
                pk_columns:{id: $order_id}
                _set:{
                    status: "REFUND_INITIATED"
                }
            ){
                id
            }

            user_wallet: insert_yt_user_wallet_one(object: $user_wallet) {
                id
            }
        }
        `;

        variables = {
            refund_request_id: refund_request_id,
            order_id: order_id,
            payment: payment,
            refund_amount: refund_amount,
            user_wallet: user_wallet
        };

    }

    /**
     * Run the GraphQL mutation on the Hasura instance
     * Use admin secret to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Cotent-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: variables
        })
    }).then(res => res.json());

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        console.log('res.errors', res.errors);
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly created/updated records
     */
    return res.data;
}
