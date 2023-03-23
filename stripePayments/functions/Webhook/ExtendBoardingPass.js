const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Extend a boarding pass by a number of days
 * @param {string} pass_id                                      the id of the pass to extend
 * @param {string} extended_by                                  the id of the sales user who extended this pass
 * @param {number} days_extended                                the number of days this pass has been extended
 * @param {string} order_id                                     the id of the order used to extend the pass
 * @param {Date} purchased_at                                   the timestamp at which order payment was received
 * 
 * @returns {Promise<{id: string}>}                             the extended boarding pass
 */
module.exports.ExtendBoardingPass = async (pass_id, extended_by, days_extended, order_id, purchased_at) => {
    const pass = await GetBoardingPass(pass_id);

    const query = `
        mutation($pass_id: uuid!, $extended_details: jsonb!, $extended_by: uuid!,
            $valid_to: timestamp!, $purchased_at: timestamp!){
            update_result: update_yt_boarding_pass_by_pk(
                pk_columns:{
                    id: $pass_id
                }
                _set:{
                    extended_at: $purchased_at,
                    extended_by: $extended_by,
                    valid_to: $valid_to
                }
                _append:{
                    extended_details: $extended_details
                }
            ){
                id
            }
        }
    `;

    /**
     * Calculate new expiry timestamp
     */
    const curr_valid_to = new Date(pass.valid_to);
    const extend_by_ms = days_extended * 86400000;      /* One day contains 8,64,00,000 milliseconds */

    const new_valid_to = new Date(curr_valid_to.valueOf() + extend_by_ms);

    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                pass_id,
                extended_by,
                purchased_at,
                valid_to: new_valid_to,
                extended_details: {
                    extended_at: purchased_at,
                    days: days_extended,
                    order_id
                }
            }
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    return res.data.update_result;
}

/**
 * Get boarding pass details
 * @param {string} pass_id                  the id of the pass to fetch details of
 * 
 * @returns {Promise<BOARDING_PASS>}        the fetched boarding pass
 */
const GetBoardingPass = async pass_id => {
    const query = `
        query($pass_id: uuid!){
            boarding_pass: yt_boarding_pass_by_pk(id: $pass_id){
                id
                valid_to
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
                pass_id
            }
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    if(!res.data.boarding_pass){
        throw new Error('Boarding Pass with given id not found.');
    }

    return res.data.boarding_pass;
}

/**
 * Type definitions
 */

 /**
  * @typedef {Object} BOARDING_PASS
  * @property {string} id
  * @property {Date} valid_to
  */