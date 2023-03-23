const fetch = require('node-fetch');
const s = require('stripe');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT     the endpoint at which Hasura GraphQL exists
 *  - HASURA_ADMIN_SECRET   the admin secret for the Hasura engine
 */
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;

module.exports.handler = async event => {
  try {
    const body = JSON.parse(event.body);

    const { transaction_id, payment_method_id } = ValidateInput(body);

    /**
     * Confirm the Stripe payment intent with the given payment method
     */
    const result = await ConfirmPayment(transaction_id, payment_method_id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        transaction_id: result.id,
        transaction_status: result.status
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
    };
  }
}

const ValidateInput = body => {
  const { transaction_id, payment_method_id } = body.input;

  const user_id = body.session_variables['x-hasura-user-id'];
  const user_role = body.session_variables['x-hasura-role'];

  if (user_role !== 'rider') {
    throw new Error('Only rider can confirm a payment');
  }

  return { transaction_id, payment_method_id, user_id };
}

/**
 * Confirm a Stripe payment with a Google Pay token
 * @param {string} payment_intent_id                          the id of the Stripe transaction
 * @param {string} gpay_token                               the Google Pay provided token
 * @param {string} card_holder_name                           the name of the user as on card selected on Google Pay
 * @param {number} cvc                                  the three digit cvc code on the back of the card
 * 
 * @returns the Stripe payment confirmation result
 */
const ConfirmPayment = async (transaction_id, payment_method_id) => {
  /**
   * Get the payment details
   */
  const payment = await GetPayment(transaction_id);

  /**
   * Abort if payment is already marked as
   *  - `PAYMENT_FAILED`    set if payment timeout happened
   *  - `PAYMENT_SUCCESS`   set if payment has already been successfully made
   */
  if (payment.status === 'PAYMENT_FAILED') {
    throw new Error('Payment failed. Please initiate new payment');
  }

  if (payment.status === 'PAYMENT_SUCCESS') {
    throw new Error('Payment already made successfully');
  }

  /**
   * Use the Stripe SDK to confirm the Payment
   */
  return stripe.paymentIntents.confirm(transaction_id, { payment_method: payment_method_id });
}

/**
 * The payment record
 * @typedef {Object} Payment
 * @property {string} id
 * @property {number} amount
 * @property {string} status
 * @property {Object} user
 * @property {string} user.id
 * @property {Object} user.metadata
 * @property {string?} user.metadata.stripe_id
 */

/**
 * Fetch the payment details
 * @param {string} transaction_id       the transaction id of the payment
 * 
 * @returns {Payment}             the fetched payment details
 */
const GetPayment = async transaction_id => {
  /**
   * Define a graphQL query to fetch payment details
   * Details fetched are
   *  - id
   *  - amount
   *  - status
   *  - user
   *    - id
   *    - metadata
   */
  const query = `
    query($transaction_id:String!){
      payments:yt_payment(where:{
        transaction_id:{_eq:$transaction_id}
      }){
        id
        amount
        status
        user{
          id
          metadata
        }
      }
    }
  `;

  /**
   * Run the GraphQL query on the YelloTaxi Hasura instance
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
        transaction_id
      }
    })
  }).then(res => res.json());

  /**
   * Throw the first error if one occurs
   */
  if (res.errors) {
    throw new Error(res.errors[0].message);
  }

  if(!res.data.payments.length){
    throw new Error('Payment with given transaction_id not found');
  }

  /**
   * Else return the fetched payment details
   */
  return res.data.payments[0];
}