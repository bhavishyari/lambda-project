const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch details of a payment record
 * @param {string} payment_id the id of the payment record to fetch
 * 
 * @returns {Promise<PAYMENT>} the fetched payment record
 */
module.exports.GetPayment = async payment_id => {
    /**
     * Define a GraphQL query to fetch payment details
     */
    const query = `
        query($payment_id: uuid!){
            payment: yt_payment_by_pk(id: $payment_id){
                id
                user{
                    id
                    full_name
                    email
                    country_code
                    mobile
                    push_registrations{
                        id
                        token
                        platform
                        provider
                        device_id
                    }
                }
                order{
                    id
                    order_number
                }
            }
        }
    `;

    /**
     * Run the GraphQL query in Hasura instance
     * Use admin secret to authorize
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
                payment_id
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
     * Throw if payment record does not exist
     */
    if(!res.data.payment){
        throw new Error('Payment record with given id does not exist');
    }

    /**
     * Else return the fetched payment details
     */
    return res.data.payment;
}

/**
 * @typedef {import('./GetUser').USER} USER
 */

/**
 * @typedef {Object} PAYMENT
 * @property {string} id                                the id of the payment record
 * @property {USER} user                                the user making this payment
 * @property {PAYMENT_ORDER} order                      the order associated with the payment
 */

/**
 * @typedef {Object} PAYMENT_ORDER
 * @property {string} id                                the id of the order
 * @property {number} order_number                      the order number
 */