const fetch = require('node-fetch');
const s = require('stripe');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the hasura admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {

    try {
        const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura action session
         */
        const { payment_id, user_id, user_role } = ValidateInput(body);

        /**
         * Fetch details about payment and order
         */
        const payment = await GetDetails(payment_id);

        /**
         * Forbid paying for order if not owned by rider user
         */
        if (user_role === 'rider' && payment.user.id !== user_id) {
            throw new Error('You are not authorized to capture this payment.');
        }

        /**
         * check transcation_id in payment record
         */
        if (!payment.transaction_id) {
            throw new Error('Transaction id not found in payment record.');
        }

        await stripe.paymentIntents.capture(payment.transaction_id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success'
            })
        }
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


/**
 * Validate request body
 * 
 * @param {Object} body 
 */
const ValidateInput = body => {

    const { payment_id } = body.input;
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    if (!['rider', 'driver', 'sales'].includes(user_role)) {
        throw new Error('You are not authorized to capture payment.');
    }

    return { payment_id };
}

/**
 * Fetch details of the payment
 * 
 * @param {string} payment_id                       the id of the payment to fetch
 * 
 * @returns {Promise<ORDER>}                        the payment record
 */
const GetDetails = async (payment_id) => {
    const query = `
        query($payment_id: uuid!){
            payment: yt_payment_by_pk(id: $payment_id){
                id
                status
                transaction_id
                type
                order {
                  id
                  status
                }
                user {
                  id
                  on_boarded_by
                  type
                }
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
              payment_id
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.payment) {
        throw new Error('Payment with given id does not exists');
    }

    return res.data.payment;
}
