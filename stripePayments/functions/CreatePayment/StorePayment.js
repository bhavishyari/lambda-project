const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Store the details of a payment
 * @param {PAYMENT_DETAILS} payment_details             the details about the payment
 * 
 * @returns {Promise<{id: string}>}                     the stored payment record
 */
module.exports.StorePayment = async payment_details => {
    const query = `
        mutation ($payment_details: yt_payment_insert_input!) {
            payment: insert_yt_payment_one(object: $payment_details) {
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
                payment_details
            }
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    return res.data.payment;
}

/**
 * @typedef {Object} PAYMENT_DETAILS
 * @property {string} user_id                           the id of the user making the payment
 * @property {string} order_id                          the id of the order for which this payment ismade
 * @property {number} amount                            the payment amount
 * @property {string} status                            the payment status
 * @property {string} payment_method                    the payment method used ('card')
 * @property {string} payment_gateway                   the payment gateway used ('STRIPE')
 * @property {string} transaction_id                    the id of the payment transaction
 * @property {string} transaction_status                the status of the transaction
 * @property {Object} transaction_data                  any relevant (`key-value` pair) metadata about the transaction
 * @property {string} type                              the type of the transaction ('C' Credit | 'D' Debit)
 */