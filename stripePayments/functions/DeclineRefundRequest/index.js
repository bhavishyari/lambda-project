const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET   the admin secret set on the Hasura instance
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {
    let body = JSON.parse(event.body);
    const { refund_request_id, decline_reason } = ValidateInput(body);

    /**
     * Decline a refund request
     */
    const result = await DeclineRefundRequest(refund_request_id, decline_reason);

    return {
        statusCode: 200,
        body: JSON.stringify({
            refund_request_id: result.id,
            status: 'DECLINED'
        })
    }
}

const ValidateInput = body => {
    /**
     * Get the role of the user calling this action
     */
    let user_role = body.session_variables['x-hasura-role'];

    /**
     * Allow only `admin` role to approve refund request
     */
    if (user_role !== 'admin') {
        throw new Error('Refund request can only be declined by `admin`');
    }

    /**
     * Get refund request, amount to refund and refund reason
     */
    let { refund_request_id, decline_reason } = body.input;

    return {
        refund_request_id, decline_reason
    };
}


/**
 * Decline a refund request
 * @param {string} refund_request_id        the id of the refund request to decline
 * @param {string} decline_reason           the reason for decline
 * 
 * @returns {Promise<{id: string}>}         the declined refund request
 */
const DeclineRefundRequest = async (refund_request_id, decline_reason) => {
    const query = `
        mutation($refund_request_id: uuid!, $decline_reason: String!){
            update_result: update_yt_refund_request_by_pk(
                id: $refund_request_id
                _set: {
                    status: "DECLINED"
                    decline_reason: $decline_reason
                }
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
                refund_request_id,
                decline_reason
            }
        })
    }).then(res => res.json())

    if(res.errors){
        throw new Error(res.errors[0].message);
    }

    return res.data.update_result;
}