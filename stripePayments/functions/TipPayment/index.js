const s = require('stripe');
const { GetUserStripeDetails } = require('../common/hasura/GetUserStripeDetails');

const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

       


        /**
         * Take out the id of the user and Authorization header from request
         */
        //  const user_id = body.session_variables['x-hasura-user-id'];
        const user_id = body.input.user_id;
        const amount = body.input.amount;
        const Authorization = event.headers.Authorization;


        /**
         * This token can be a card or bank account token created using Stripe.js SDK in Frontend
         * @type {string}
         */

        /**
         * Fetch user's stripe details
         */
        const user = await GetUserStripeDetails(user_id, Authorization);

        /**
         * Abort if user isn't a Stripe customer
         */
        console.log(user,'user')
        if (!user.metadata.stripe_id) {
            throw new Error('Not a Stripe customer. Create one first.')
        }

        /**
         * Create and Attach source to Stripe customer. Also store source id to user record in Hasura
         */
        const pm = await MakePayment(user, amount);

        return {
            statusCode: 200,
            body: JSON.stringify(pm)
        };
    }
    catch (err) {
        console.log(err);

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}


const MakePayment = async (user, amount) => {
    return stripe.charges.create({ 
        amount: amount*100,    // Charing Rs 25 
        description: 'payment for trip', 
        currency: 'USD', 
        customer: user.metadata.stripe_id 
    }); 
}
