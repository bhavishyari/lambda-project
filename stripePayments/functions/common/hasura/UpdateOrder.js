const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Updates an order with new values
 * @param {string} order_id the id of the order to update
 * @param {Object} update_details an Object containing updated key-value pairs
 * 
 * @returns {Promise<{id: string}>} the updated order
 */
module.exports.UpdateOrder = async (order_id, update_details) => {
    const query = `
        mutation($order_id: uuid!, $update_details: yt_order_set_input!){
            result: update_yt_order_by_pk(
                pk_columns: {
                    id: $order_id
                }
                _set: $update_details
            ){
                id
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
                order_id,
                update_details
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res.data.result;
}