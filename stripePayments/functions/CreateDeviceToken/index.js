
const s = require('stripe');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

const {AuthorizationError} = require('./../common/Error');

module.exports.handler = async event => {

    try {
        // const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura action session
         */
        const { user_id, user_role } = ValidateInput(body);

        /**
         * create connection token
         */
        let connectionToken = await stripe.terminal.connectionTokens.create();

        // console.log('stripe connectionToken :', connectionToken);

        return {
            statusCode: 200,
            body: JSON.stringify({
                secret: connectionToken.secret,
            })
        };
    }
    catch (err) {

        // console.log(err);
        let errType = (err.type) ? err.type : err.name;
        switch (errType) {
            case 'StripeRateLimitError':
                // Too many requests made to the API too quickly
                console.log('ErrorFromStripe : StripeRateLimitError : ', err.message);
                break;
            case 'StripeInvalidRequestError':
                // Invalid parameters were supplied to Stripe's API
                console.log('ErrorFromStripe : StripeInvalidRequestError : ', err.message);
                break;
            case 'StripeAPIError':
                // An error occurred internally with Stripe's API
                console.log('ErrorFromStripe : StripeAPIError : ', err.message);
                break;
            case 'StripeConnectionError':
                // Some kind of error occurred during the HTTPS communication
                console.log('ErrorFromStripe : StripeConnectionError : ', err.message);
                break;
            case 'StripeAuthenticationError':
                // You probably used an incorrect API key
                console.log('ErrorFromStripe : StripeAuthenticationError : ', err.message);
                break;
            case 'AuthorizationError':
                // Authorization error
                console.log('AuthorizationError : ', err.message);
                break;
            default:
                // Handle any other types of unexpected errors
                // console.log('Error : ', err.message);
                break;
        }

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
}

const ValidateInput = body => {

    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    if (!['admin', 'driver', 'sales'].includes(user_role)) {
        throw new AuthorizationError('You are not authorized to get device token.');
    }

    return { user_id, user_role };
}
