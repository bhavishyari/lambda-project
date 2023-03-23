const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch user metadata containing stripe related details
 * @param {string} user_id                                      the id of the user
 * @param {string} Authorization                                the authorization header to use
 * 
 * @returns {Promise<UserStripeInfoObject>}                     the user's Stripe details
 */
module.exports.GetUserStripeDetails = async (user_id, Authorization) => {
    /**
     * Create a GraphQL query to fetch user's Stripe details
     * Details fetched are
     *  - id
     *  - metadata
     */
    const query = `
        query($user_id: uuid!){
            user: yt_user_by_pk(id: $user_id){
                id
                metadata
            }
        }
    `;

    /**
     * Run the GraphQL mutation in Hasura
     * use user Authorization header
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret':HASURA_ADMIN_SECRET,
            
        },
        body: JSON.stringify({
            query,
            variables: {
                user_id
            }
        })
    }).then(res => res.json())

    /**
     * Throw error if it occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message)
    }

    /**
     * Abort if user does not exists
     */
    if (!res.data.user) {
        throw new Error('User does not exist');
    }

    return res.data.user;
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} StripePaymentMethod
 * @property {string} id                                        the id of the card payment mathod
 * @property {string} brand                                     the brand of card ('visa' | 'amex' | ... )
 * @property {string} last4                                     the last 4 digits of card's pan
 */

/**
 * @typedef {Object} UserStripeInfoObject
 * @property {string} id                                                the id of the user
 * @property {Object} metadata                                          metadata containing Stripe details
 * @property {string} metadata.stripe_id                                the Stripe customer id of the user
 * @property {StripePaymentMethod[]?} metadata.payment_methods          the list of saved payment sources of the user
 */