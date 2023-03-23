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
        const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Validate input and Hasura action session
         */
        const { order_id, payment_method_id, terminal, currency, user_id, user_role } = ValidateInput(body);

        /**
         * Fetch details about order to create payment for
         */
        const order = await GetDetails(order_id, Authorization);

        console.log(user_role,'user_role')
        console.log(order,'order data')
        console.log(user_id,'user_id')
        /**
         * Forbid paying for order if not owned by rider user
         */
        if (user_role === 'rider' && order.user.id !== user_id) {
            throw new Error('You are not authorized to create payment for this order.');
        }

        /**
         * Forbid paying for orders which are already paid, or refunded
         */
        if (order.status !== 'ORDER_CREATED') {
            throw new Error('Invalid order status, valid status is ORDER_CREATED.');
        }

        /**
         * Create a payment for the order
         */
        const payment = await CreatePayment(order, payment_method_id, terminal, currency, user_id);

        if (payment.intent.status !== 'succeeded') {
            /**
             * Payment initiated. Update status.
             * If payment succeeds, Stripe webhook will update order status
             */
            await UpdateOrder(order.id, { status: 'ORDER_PENDING' });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                order_id: order.id,
                payment_id: payment.record.id,
                transaction_id: payment.intent.id,
                client_secret: payment.intent.client_secret,
                transaction_status: payment.intent.status
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

const ValidateInput = body => {
    const { order_id, payment_method_id, terminal, currency } = body.input;
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    if (!['rider', 'driver', 'sales'].includes(user_role)) {
        throw new Error('You are not authorized to create payment.');
    }

    if (user_role !== 'rider' && payment_method_id) {
        throw new Error('Only rider can initiate payment with a payment method');
    }

    if (!['usd', 'inr'].includes(currency)) {
        throw new Error('Invalid currenty, only usd or inr supported.');
    }

    return { order_id, payment_method_id, terminal, currency, user_id, user_role };
}

/**
 * Fetch details of the order
 * @param {string} order_id                         the id of the order to fetch
 * @param {string} Authorization                    the authorization header to use
 * 
 * @returns {Promise<ORDER>}                        the order record
 */
const GetDetails = async (order_id, Authorization) => {
    const query = `
        query($order_id: uuid!){
            order: yt_order_by_pk(id: $order_id){
                id
                order_number
                user{
                    id
                    email
                    metadata
                }
                net_amount
                service{
                    id
                    title
                    type
                }
                status
                created_at
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
                order_id
            }
        })
    }).then(res => res.json());

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.order) {
        throw new Error('Order with given id does not exists');
    }

    return res.data.order;
}

/**
 * Create a payment Intent for an order
 * @param {ORDER} order                 the order for which the payment is to be made
 * @param {string?} payment_method_id   the id of the payment method to use
 * @param {boolean} terminal            enable terminal for payment intent 
 * @param {strig} currency              the currency for the payment intent
 * @param {string} user_id              the id of the user creating this payment
 */
const CreatePayment = async (order, payment_method_id, terminal, currency, user_id) => {

    /**
     * Parameters for initiating the Stripe payment
     * @type {s.Stripe.PaymentIntentCreateParams}
     */
    const params = {
        amount: parseInt(order.net_amount * 100),  // convert amount to cents
        description: `Payment for ${order.service.title}`,
        currency: currency,  // usd | inr
        customer: order.user.metadata.stripe_id,
        metadata: {
            order_id: order.id,
            order_number: order.order_number,
            service_id: order.service.id,
            service_type: order.service.type,
            initiated_at: new Date()
        }
    };

    console.log(params,'params')

    /**
     * add receipt_email in payment intent
     */
    if (order.user.email) {
        params.receipt_email = order.user.email;
    }

    /**
     * Add payment method if provided
     */
    if (payment_method_id) {
        params.payment_method = payment_method_id;
        params.confirm = true;
    }

    /**
     * add terminal related parameter
     *   - payment_method_types: ['card_present'],
     *   - capture_method: 'manual',
     */
    if (terminal===true) {
        params.payment_method_types = ['card_present'];
        params.capture_method = 'manual';
    }

    /**
     * Create a Stripe payment Intent
     */
    const intent = await stripe.paymentIntents.create(params);

    /**
     * Store payment details to Hasura
     * @type {PAYMENT_DETAILS}
     */
    let payment_details = {
        user_id: order.user.id,
        created_by: user_id,
        order_id: order.id,
        amount: order.net_amount,
        status: 'PAYMENT_INITIATED',
        payment_method: 'card',
        payment_gateway: 'STRIPE',
        transaction_id: intent.id,
        transaction_status: intent.status,
        transaction_data: {
            initiated_by: user_id
        },
        type: 'C'
    };

    /**
     * Store the payment record in database
     */
    const record = await StorePayment(payment_details);

    return { record, intent };
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} ORDER
 * @property {string} id                        the id of the order
 * @property {number} net_amount                the net payable amount of the order
 * @property {string} status                    the current status of the order
 * @property {Date} created_at                  the order creation timestamp
 * @property {Object} service                   the service associated with the order
 * @property {string} service.title             the title of the service associated with the order
 * @property {USER} user                        the details about the user who made this order
 */

/**
 * @typedef {Object} STRIPE_PAYMENT_SOURCE
 * @property {string} source_id                                 the id of the source (payment mathod)
 * @property {string} source_type                               the type of the source ('card' | 'three_d_secure')
 * @property {string} last4                                     the last 4 digits of card's pan
 */

/**
 * @typedef {Object} USER
 * @property {string} id                                        the id of the user
 * @property {Object} metadata                                  metadata containing Stripe details
 * @property {string} metadata.stripe_id                        the Stripe customer id of the user
 * @property {STRIPE_PAYMENT_SOURCE[]?} metadata.sources          the list of saved payment sources of the user
 */

/**
 * @typedef {import('./StorePayment').PAYMENT_DETAILS} PAYMENT_DETAILS
 */