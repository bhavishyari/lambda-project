const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch user's push registration details
 * @param {string} user_id the id of the user to fetch
 * 
 * @returns {Promise<USER>} the fetched user record
 */
module.exports.GetUser = async user_id => {
    /**
     * Create GraphQL query to fetch user's details
     */
    const query = `
        query($user_id:uuid!){
            user: yt_user_by_pk(id:$user_id){
                id
                full_name
                email
                country_code
                mobile
                push_registrations{
                    id
                    token
                    platform
                    provider
                    device_id
                }
            }
        }
    `;

    /**
    * Run the GraphQL query on the Hasura instance
    * Use admin secret to authorize
    */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                user_id
            }
        })
    }).then(res => res.json())

    /**
    * Throw the first error if occurs
    */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if user not found
     */
    if(!res.data.user){
        throw new Error('User with given id not found');
    }

    /**
    * Else return the fetched user details
    */
    return res.data.user;
}

/**
 * @typedef {Object} USER
 * @property {string} id                                            the id of the user
 * @property {string} full_name                                     the full name of the user
 * @property {string} email                                         the email of the user
 * @property {string} country_code                                  the country code of user's phone
 * @property {string} mobile                                        the user's phone number
 * @property {PUSH_REGISTRATION[]} push_registrations               the registrations for push notification on user's devices
 */

/**
 * @typedef {Object} PUSH_REGISTRATION
 * @property {string} id                                            the id of the registration
 * @property {string} token                                         the user token
 * @property {string} platform                                      the platform to which the push notification will be sent ('mobile' | 'web')
 * @property {string} provider                                      the 3rd party push notification system being used ('FIREBASE')
 * @property {string} device_id                                     the id of the registered user device
 */