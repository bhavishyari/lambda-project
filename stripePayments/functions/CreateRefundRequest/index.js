const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which YelloCab's Hasura GraphQL engine exists
 *  - HASURA_ADMIN_SECRET   the admin secret of Hasura GraphQL engine 
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {
    try {
        const Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        const { user_id, order_id } = ValidateInput(body);

        /**
         * Fetch order details
         */
        const order = await GetOrder(order_id, Authorization);

        /**
         * Refund amount must be less than or equal to order's net amount
         */
        // if (refund_amount > order.net_amount) {
        //     throw new Error('Refund amount can not be larger than order net amount');
        // }

        /**
         * Refund request can not be initiated for unpaid/already refunded order
         */
        if (order.status !== 'ORDER_PAID') {
            throw new Error('Unpaid or Refunded order can not be requested for refund');
        }

        if (order.refund_request != null) {
            throw new Error(`Refund request is already exists for this order with ${order.refund_request.status} status.`);
        };

        if (order.boarding_passes.length > 0) {
            throw new Error('You cannot submit refund request for this order, Boarding pass is used for one or more ride.');
        }

        /**
         * Create the refund request for the order
         * 
         * order_id, user_id, refund_amount, Authorization
         */
        const refund_request = await CreateRefundRequest(order.id, user_id, order.net_amount, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify({
                refund_request_id: refund_request.id
            })
        };
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
    /**
     * Get user id and role from Hasura action's session variables
     */
    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];

    /**
     * Allow only `rider` users to create refund requests
     */
    if (user_role !== 'rider') {
        throw new Error('Refund request can be created only by `rider` user.');
    }

    /**
     * Get id of the order and the amount to refund from input
     */
    const { order_id } = body.input;

    if (!order_id) {
        throw new Error('order_id is required.');
    }

    return {
        user_id,
        user_role,
        order_id
    };
}

/**
 * Get details about an order
 * @param {string} order_id                 the id of the order to fetch
 * @param {string} Authorization            the authorization header to use
 * 
 * @returns {Promise<ORDER>}                the fetched order details
 */
const GetOrder = async (order_id, Authorization) => {
    const query = `
        query($order_id: uuid!){
            order: yt_order_by_pk(id: $order_id){
                id
                net_amount
                status
                refund_request {
                    id
                    status
                }
                boarding_passes(where: {valid_to:{_neq: null}}) {
                    id
                    status
                    valid_to
                    valid_from
                }
            }
        }
    `;

    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                order_id
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.order) {
        console.log('Order with given id not found');
    }

    return res.data.order;
}

/**
 * Create a new refund request for for an order
 * @param {string} order_id                             the id of the order to create refund request for
 * @param {string} user_id                              the id of user who requesting refund request for their order
 * @param {number} refund_amount                        the amount to refund
 * @param {string} Authorization                        the authorization token to use
 * 
 * @returns {Promise<{id: string}>}                     the newly created refund request
 */
const CreateRefundRequest = async (order_id, user_id, refund_amount, Authorization) => {
    /**
     * Define a GraphQL mutation to insert a new refund request record
     * Details inserted are
     *  - order_id              the id of the order to create refund request for
     *  - requesting_user_id    the id of the sales user (taken automatically from the `Authorization` token)
     */
    const query = `
        mutation ($order_id: uuid!, $user_id: uuid!, $refund_amount: float8! ) {
            refund_request: insert_yt_refund_request_one(object: {
                order_id: $order_id
                requesting_user_id: $user_id,
                refund_amount: $refund_amount
                status: "NEW"
            }) {
                id
            }

            order: update_yt_order_by_pk(
                pk_columns:{id: $order_id}
                _set:{
                    status: "REFUND_REQUESTED"
                }
            ){
                id
            }

            boarding_pass: update_yt_boarding_pass(
                where: {
                  order_id: {_eq: $order_id}
                }, 
                _set: {
                  status: "CANCELED"
                }
              ) {
                returning {
                  id
                }
                affected_rows
              }

        }
    `;

    /**
     * Run the GraphQL mutation on YelloCab Hasura instance
     * Use user Authorization token
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
                order_id,
                user_id,
                refund_amount
            }
        })
    }).then(res => res.json());

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly created refund request
     */
    return res.data.refund_request;
}

/**
 * @typedef {Object} ORDER
 * @property {string} id                    the id of the order
 * @property {number} net_amount            the net amount of the order
 * @property {string} status                the current status of the order
 */