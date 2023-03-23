const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET           the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * The Order details for storing into Hasura
 * @typedef {Object} ORDER
 * @property {string?} id                           the id of the order
 * @property {string} plan_id                       the id of the plan, if order is purchase of a plan
 * @property {string} user_id                       the id of the user making this order
 * @property {number} amount                        the gross amount of the order
 * @property {number} discount                      the discount applied on the order
 * @property {Object} discount_details              the discount details
 * @property {number} tax                           the tax levied on the order
 * @property {Object} tax_details                   the tax details
 * @property {number} transaction_charge            teh fixed charge applied on the transaction
 * @property {number} net_amount                    the net payable amount of the order
 * @property {string} service_id                    the id of the service associated with the order
 * @property {Object} service_details               any metadata about the service associated with the order
 * @property {Object} commission_details            any metadata about commission for sales or driver user
 * @property {string?} created_by                   the id of the sales user who created this order
 * @property {string} status                        the status of the order
 */

/**
 * Stores a new order
 * @param {ORDER} order_details                     the details of the order to store
 * @param {Object} coupon_details                   the details of the coupon_used to store
 * 
 * @returns {Promise<{id: string}>}                 the newly stored order
 */
module.exports.StoreOrder = async (order_details, coupon_details = null) => {

    if (coupon_details) {
        var query = `
            mutation($order_details: yt_order_insert_input!, $coupon_details:yt_coupon_used_insert_input!){

                order: insert_yt_order_one(object: $order_details){
                    id
                    service_id
                    user_id
                    status
                    order_number
                    amount
                    discount
                    tax
                    transaction_charge
                    net_amount
                    tax_details
                    discount_details
                }

                coupon_used: insert_yt_coupon_used_one(object: $coupon_details){
                    id
                }
            }
        `;

        var variables = {
            order_details,
            coupon_details
        };

    } else {
        var query = `
            mutation($order_details: yt_order_insert_input!){

                order: insert_yt_order_one(object: $order_details){
                    id
                    service_id
                    user_id
                    status
                    order_number
                    amount
                    discount
                    tax
                    transaction_charge
                    net_amount
                    tax_details
                    discount_details
                }

            }
        `;

        var variables = {
            order_details
        };
    }



    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: variables
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    console.log('new order created : id : ', res.data.order.id);

    return res.data.order;
}