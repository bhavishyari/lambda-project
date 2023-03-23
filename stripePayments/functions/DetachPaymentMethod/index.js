const s = require('stripe');
const { GetUserStripeDetails } = require('../common/hasura/GetUserStripeDetails');
const { UpdateUser } = require('../common/hasura/UpdateUser');

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
         * Get the payment method's id from input
         */
        const payment_method_id = body.input.payment_method_id;

        /**
         * Get the Stripe customer details of the user
         */
        const user = await GetUserStripeDetails(user_id, Authorization);

        /**
         * Detach the payment method from the Stripe customer and update database
         */
        const pm = await DetachPaymentMethod(user, payment_method_id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                payment_method_id: pm.id,
                stripe_id: user.metadata.stripe_id
            })
        };
    }
    catch (err) {
        console.log(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
}

/**
 * Detach a payment method from a Stripe customer
 * @param {UserStripeInfoObject} user                       the user object containing Stripe customer details
 * @param {string} payment_method_id                        the payment method to detach
 * 
 * @returns the payment method that was detached
 */
const DetachPaymentMethod = async (user, payment_method_id) => {
    /**
     * Filter out the payment method to detach from the list of methods in user
     * @type {StripePaymentMethod}
     */
    let method_to_detach = null;
    user.metadata.payment_methods = user.metadata.payment_methods.filter((method) => {
        if (method.id === payment_method_id) {
            method_to_detach = method;

            return false;
        }
        return true;
    })

    if (!method_to_detach) {
        throw new Error('Payment method not found in user record');
    }

    /**
     * Detach payment method from Stripe
     */
    await stripe.paymentMethods.detach(method_to_detach.id);

    /**
     * Update user in database
     */
    await UpdateUser(user.id, { metadata: user.metadata });

    return method_to_detach;
}

/**
 * Imported type definitions
 *
 * @typedef {import('../common/hasura/GetUserStripeDetails').UserStripeInfoObject} UserStripeInfoObject
 * @typedef {import('../common/hasura/GetUserStripeDetails').StripePaymentMethod} StripePaymentMethod
 */