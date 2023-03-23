const s = require('stripe');
const { GetRefundRequest } = require('./GetRefundRequest');
const { StoreRefund } = require('./StoreRefund');

const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

exports.handler = async event => {
    try {
        let body = JSON.parse(event.body);
        const { refund_request_id, amount, reason } = ValidateInput(body);

        /**
         * Get the refund request record with the order details
         */
        let refund_request = await GetRefundRequest(refund_request_id);

        /**
         * Abort if amount is greater than that in refund request
         */
        if (amount > refund_request.refund_amount) {
            throw new Error('Amount is greater than order amount.');
        }

        if (refund_request.status !== 'NEW') {
            throw new Error('Invalid status of refund request.');
        }

        /**
         * convert amount to cents
         */
        let amount_in_cents = parseInt(amount * 100);

        /**
         * Approve the refund and start the payment reversal process in Stripe
         */
        const refund = await ApproveRefundRequest(refund_request, amount, amount_in_cents, reason);

        return {
            statusCode: 200,
            body: JSON.stringify({
                refund_id: refund.id
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

const ValidateInput = body => {
    /**
     * Get the role of the user calling this action
     */
    let user_role = body.session_variables['x-hasura-role'];

    //console.log('ApproveRefundRequest : ValidateInput : body.session_variables : ', body.session_variables);

    /**
     * Allow only `admin` role to approve refund request
     */
    if (user_role !== 'admin') {
        throw new Error('Refund request can only be approved by `admin`');
    }

    // 'duplicate' | 'fraudulent' | 'requested_by_customer'


    /**
     * Get refund request, amount to refund and refund reason
     */
    let { refund_request_id, amount, reason } = body.input;

    return {
        refund_request_id, amount, reason
    };
}



/**
 * Approve a refund request
 * @param {REFUND_REQUEST} refund_request the refund request record
 * @param {number} amount the amount to refund
 * @param {number} amount_in_cents the amount to refund in cents
 * @param {string} reason the reason for refund (`duplicate` | `fraudulent` | `requested_by_customer`)
 */
const ApproveRefundRequest = async (refund_request, amount, amount_in_cents, reason) => {

    /**
     * Initiate refund with Stripe
     */
    let refund = await RefundOrder(refund_request.id, refund_request.order, amount_in_cents, reason);

    /**
     * Calculate total commission of order to debit it from user wallet
     */
    let commission_amount = 0;
    if (refund_request.order && refund_request.order.user_wallets) {
        if (Array.isArray(refund_request.order.user_wallets)) {
            commission_amount = refund_request.order.user_wallets.reduce(function(prev, cur) {
                return prev + cur.amount;
            }, 0);
        }
    }

    /**
     * Store `refund` record and update `refund_request` and `order` records
     */ 
    // const { id, order: { user_id, id: order_id } } = refund_request;
    let records = await StoreRefund(
        refund_request.id, 
        refund_request.order.user_id, 
        refund_request.order.id, 
        refund,
        amount,
        commission_amount
    );

    /**
     * Return the refund record
     */
    return records.refund;
}


/**
 * Issues a Stripe refund for an order
 * @param {string} refund_request_id            the id of refund_request
 * @param {ORDER} order                         the order to refund
 * @param {number} amount                       the amount to refund, in cents
 * @param {string} reason                       the reason for refund ('duplicate' | 'fraudulent' | 'requested_by_customer')
 * 
 * @returns the refund object Promise from stripe
 */
const RefundOrder = async (refund_request_id, order, amount, reason) => {

    console.log("RefundOrder : refund_request_id : ", refund_request_id);

    /**
     * Get the payment made on this order. It's `transaction_id` will be used to initiate refund
     */
    let payment = order.payments[0];

    /**
     * Use the Stripe SDK to issue the refund
     */
    let refund = await stripe.refunds.create({
        payment_intent: payment.transaction_id,
        amount,
        reason,
        metadata: {
            'refund_request_id': refund_request_id,
            'order_id': order.id
        }
    });
    
    // console.log('RefundOrder : stripe refund object : ', refund);

    /**
     * Return the Stripe returned Refund object
     */
    return refund;
}



/**
 * Type definitions
 */

/**
 * The ApproveRefundRequest input
 * @typedef {Object} ApproveRefundRequestInput
 * @property {string} ApproveRefundRequestInput.refund_request_id   the id of the refund request record to approve
 * @property {number} ApproveRefundRequestInput.amount              the amount to refund
 * @property {string} ApproveRefundRequestInput.reason              the refund reason `duplicate` | `fraudulent` | `requested_by_customer`
 */

/**
 * @typedef {import('./GetRefundRequest').REFUND_REQUEST} REFUND_REQUEST
 * @typedef {import('./GetRefundRequest').ORDER} ORDER
 */