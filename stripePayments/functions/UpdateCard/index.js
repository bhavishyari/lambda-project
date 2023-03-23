const s = require('stripe');
const {
    GetUserStripeDetails
} = require('../common/hasura/GetUserStripeDetails');
const {
    UpdateUser
} = require('../common/hasura/UpdateUser');

const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * Take out the id of the user and Authorization header from request
         */
        const user_id = body.session_variables['x-hasura-user-id'];
        const Authorization = event.headers.Authorization;


        /**
         * This token can be a card or bank account token created using Stripe.js SDK in Frontend
         * @type {string}
         */
        const token = body.input.token;
        const isDefault = body.input.isDefault;

        /**
         * Fetch user's stripe details
         */
        const user = await GetUserStripeDetails(user_id, Authorization);

        /**
         * Abort if user isn't a Stripe customer
         */
        if (!user.metadata.stripe_id) {
            throw new Error('Not a Stripe customer. Create one first.')
        }

        /**
         * Create and Attach source to Stripe customer. Also store source id to user record in Hasura
         */
        const pm = await UpdateCard(user, body.input,isDefault, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify({
                payment_method_id: pm.id,
                brand: pm.brand,
                last4: pm.last4,
                stripe_id: user.metadata.stripe_id,
                exp_month: pm.exp_month,
                exp_year: pm.exp_year,
                name: pm.name,
                isDefault:pm.isDefault
            })
        };
    } catch (err) {
        console.log(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}



/**
 * Attach a payment source to a Stripe customer
 * @param {UserStripeInfoObject} user                           the user's Stripe details
 * @param {string} token                                        the card token got from `stripe.js`
 * 
 * @returns {Promise<StripePaymentMethod>}                      the newly added Payment method
 */
const UpdateCard = async (user, data,isDefault) => {
    /**
     * Create a new Stripe Payment method
     */
    console.log(data, user.metadata, 'data and metadata')
    const payment_method = await stripe.paymentMethods.update(
        data.card_id, {
            billing_details: {
                name: data.name
            },
            card: {
                exp_month: data.exp_month,
                exp_year: data.exp_year
            }
        }
    );



    /**
     * Detach the method to the Stripe customer
     */

    let update_card_d = null;
    user.metadata.payment_methods = user.metadata.payment_methods.filter((method) => {

        if (isDefault == true) {
            method.isDefault = false;
        }

        if (method.id === data.card_id) {
            method.isDefault = isDefault;
            method.exp_month = payment_method.card.exp_month;
            method.exp_year = payment_method.card.exp_year;
            method.name = payment_method.billing_details.name;
            update_card_d = method;
        }
        return method;
    })



    let metadata = user.metadata;
    if (!metadata.payment_methods) {
        metadata.payment_methods = [];
    }

    /**
     * Update user metadata to reflect new payment method
     */
    await UpdateUser(user.id, {
        metadata: user.metadata
    });

    /**
     * Else return the newly created source details
     */
    console.log(update_card_d)
    return update_card_d;
}

/**
 * Imported type definitions
 *
 * @typedef {import('../common/hasura/GetUserStripeDetails').UserStripeInfoObject} UserStripeInfoObject
 * @typedef {import('../common/hasura/GetUserStripeDetails').StripePaymentMethod} StripePaymentMethod
 */