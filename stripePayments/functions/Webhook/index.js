const s = require('stripe');
const { GetPayment } = require('./GetPayment');
const { RecordSuccessfulPayment } = require('./RecordSuccessfulPayment');
const { RecordSuccessfulRefund } = require('./RecordSuccessfulRefund');
const { CreateBoardingPass } = require('./CreateBoardingPass');
const { CreateDriverTip } = require('./CreateDriverTip');
const { ExtendBoardingPass } = require('./ExtendBoardingPass');
const { UpgradeBoardingPass } = require('./UpgradeBoardingPass');

const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

exports.handler = async event => {
    
    let stripeEvt = JSON.parse(event.body);


    console.log(stripeEvt,'stripeEvt');

    // TODO : Verifying signatures : https://stripe.com/docs/webhooks/signatures
    // Signing secret:
    // let endpointSecret = "whsec_MGdO2B8lNW19d7S78KCJF48O2lFuJJk5"
    // let sig = (event.headers['Stripe-Signature']) ? event.headers['Stripe-Signature'] : event.headers['stripe-signature'];
    // let stripeEvt;
    // try {
    //     stripeEvt = stripe.webhooks.constructEvent(JSON.parse(event.body), sig, endpointSecret);
    // }
    // catch (err) {
    //     console.log('stripe.webhooks.constructEvent : error : ', err);
    //     return {
    //         statusCode: 400,
    //         body: JSON.stringify({ "msg": err.message })
    //     };
    // }
    
    // console.log('event', event);


    try {
        // more event's to r&d
        // charge.captured
        // charge.succeeded

        if (stripeEvt.type === 'payment_intent.succeeded') {

            /**
             * @type {s.Stripe.PaymentIntent}
             */
            let intent = stripeEvt.data.object;

            let live_mode = stripeEvt.livemode;

            /**
             * Get the associated payment records
             */
            let payment = await GetPayment(intent.id);

            /**
             * update transaction data for the payment
             */
            const transaction_data = {
                ...payment.transaction_data,
                event_type: stripeEvt.type,
                live_mode: live_mode,
                metadata: intent.metadata,
                amount_unit: 'cent',
                amount: intent.amount,
                amount_capturable: intent.amount_capturable,
                amount_received: intent.amount_received,
                currency: intent.currency,
                customer: intent.customer,
                description: intent.description,
                payment_method: intent.payment_method,
                payment_method_details: intent.charges.data[0].payment_method_details,
                receipt_url: intent.charges.data[0].receipt_url,
                received_at: new Date(intent.charges.data[0].created * 1000),

            };

            const transaction_status = intent.status;

            /**
             * Record successful payment in database
             */
            await RecordSuccessfulPayment({
                order: {
                    id: payment.order.id
                },
                payment: {
                    id: payment.id,
                    transaction_data,
                    transaction_status
                }
            });

            /**
             * Update relevant services
             */
            await UpdateServices(payment, payment.order, transaction_data.received_at);

            console.log('stripe event processed : payment_intent.succeeded : ', intent.id);
        } else if (stripeEvt.type === 'charge.refunded') {
        
            /**
             * @type {s.Stripe.PaymentIntent}
             */
            let intent = stripeEvt.data.object;

            // console.log('intent : ', JSON.stringify(intent));

            let live_mode = stripeEvt.livemode;

            let metadata = intent.refunds.data[0].metadata;

            /**
             * stripe refund id, prefix with "re_"
             * e.g. re_1HeeExKXJcDam8kWy4wyKhk2
             */
            let refund_id = intent.refunds.data[0].id;  // yt_payment.transaction_id

            /**
             * Get the associated payment record
             */
            let payment = await GetPayment(refund_id);

            /**
             * update transaction data for the payment
             */
            const transaction_data = {
                ...payment.transaction_data,
                event_type: stripeEvt.type,
                live_mode: live_mode,
                metadata: metadata,
                amount_unit: 'cent',
                // amount: intent.amount,
                // amount_capturable: intent.amount_capturable,
                // amount_received: intent.amount_received,
                // currency: intent.currency,
                // customer: intent.customer,
                // description: intent.description,
                payment_method: intent.payment_method,
                payment_method_details: intent.payment_method_details,
                receipt_url: intent.receipt_url,
                received_at: new Date(intent.refunds.data[0].created * 1000),

            };

            const transaction_status = intent.status;

            /**
             * Record successful refund in database
             */
            await RecordSuccessfulRefund({
                refund_request: {
                    id: metadata.refund_request_id,
                    order_id: metadata.metadata
                },
                payment: {
                    id: payment.id,
                    transaction_data,
                    transaction_status
                }
            });

            console.log('stripe event processed : charge.refunded : ', intent.id);

        }
    }
    catch (err) {
        /**
         * Log error for debug purpose
         */
        console.log(err);
    }

    /**
     * Acknowledge Stripe about Webhook notification
     */
    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
}

/**
 * Update Yello Taxi services based on the details of a completed order
 * 
 * @param {import('./GetPayment').PAYMENT} payment 
 * @param {import('./GetPayment').ORDER} order 
 * @param {Date} complete_at 
 */
const UpdateServices = async (payment, order, complete_at) => {

    if (order.service_details && order.service_details.purchase_plan) {

        /**
         * Order was for boarding pass PURCHASE
         */
        await CreateBoardingPass(
            order,
            payment.id,
            payment.amount,
            complete_at);

    } else if (order.service_details && order.service_details.purchase_tip_for_ride) {

        // console.log('UpdateServices : purchase_tip_for_ride');
        /**
         * Order was for driver tip PURCHASE
         */
        await CreateDriverTip(
            payment.id, 
            payment.amount, 
            order.service_details.purchase_tip_for_ride, 
            order.id);

    } else if (order.service_details && order.service_details.extend_by_days) {

        /**
         * Order was for boarding pass EXTENSION
         */
        await ExtendBoardingPass(
            order.service_details.boarding_pass_id, 
            order.created_by,
            order.service_details.extend_by_days, 
            order.id, 
            complete_at);

    } else if (order.service_details && order.service_details.upgrade_to_plan) {

        /**
         * Order was for boarding pass UPGRADE
         */
        await UpgradeBoardingPass(
            order.service_details.boarding_pass_id,
            order.service_details.upgrade_to_plan, 
            order.id, 
            complete_at);
    }
}
