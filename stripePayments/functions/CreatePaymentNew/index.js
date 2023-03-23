const fetch = require('node-fetch');
const s = require('stripe');
const { StorePayment } = require('./StorePayment');
const { UpdateOrder } = require('../common/hasura/UpdateOrder');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {

    try {
        const body = JSON.parse(event.body);
        console.log(body,'body data');
        return {
            statusCode: 200,
            body: "body"
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