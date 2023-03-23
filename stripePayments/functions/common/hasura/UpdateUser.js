const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT                   the endpoint at which Yello Taxi's Hasura instance is
 *  - HASURA_ADMIN_SECRET               the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.UpdateUser = async (user_id, update_details) => {
    const query = `
        mutation ($user_id: uuid!, $update_details: yt_user_set_input!) {
            user: update_yt_user_by_pk(
                pk_columns:{ id:$user_id }
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
                user_id,
                update_details
            }
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    return res.data.user;
}