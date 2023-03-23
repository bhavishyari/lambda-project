const fetch = require('node-fetch');
const admin = require('firebase-admin');

const { AttachCustomClaims } = require('../common/firebase/AttachCustomClaims');

/**
 * Load the required values from ENVIRONMENT
 *  - HASURA_ENDPOINT       the public endpoint for our Hasura instance
 *  - HASURA_ADMIN_SECRET   the admin secret for HASURA
 *  - SERVICE_ACCOUNT       the Service Account details for the Firebase Admin SDK
 */
// const SERVICE_ACCOUNT = require('../../serviceAccount.json');
const SERVICE_ACCOUNT = require('../../' + process.env.FIREBASE_CREDENTIAL_FILE);
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

const USER_TYPE = 'rider';

/**
 * Initialize the Firebase admin SDK with our SERVICE Account if NOT already done
 */
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT)
    });
}

/**
 * Creates a new rider profile. 
 * 
 * Requires firebase provided authentication token. User first needs to sign up with Firebase.
 * Then use the Firebase provided `idToken` as authorization Bearer token to use this endpoint
 */
exports.handler = async event => {
    try {
        let Authorization = event.headers.Authorization;
        const body = JSON.parse(event.body);

        /**
         * Replace the token's `Bearer ` part with empty string to get the actual token for verification
         */
        if (!Authorization) {
            throw new Error('No authorization header provided');
        }
        Authorization = Authorization.replace('Bearer ', '');
        const { full_name, email, address, profile } = body;

        if (!full_name) {
            throw new Error('Full name is required.');
        }

        /**
         * Decode the firebase token to get `uid` and `phone` of the authenticated user
         */
        const decoded = await admin.auth().verifyIdToken(Authorization);
        const provider_id = decoded.uid, phone = decoded.phone_number;

        /**
         * The phone field contains number with country code prefixed to it.
         * Slice out the country code and mobile number into two separate variables
         */
        const country_code = phone.slice(0, phone.length - 10);
        const mobile = phone.slice(-10);

        /**
         * Create a new `rider` profile in YelloCab
         */
        let new_user = await CreateYelloCabProfile({
            full_name,
            email,
            address,
            profile,
            country_code,
            mobile,
            type: USER_TYPE,
            provider: 'FIREBASE',
            provider_id,
            verified: true,
            active: true
        });

        /**
         * Generate custom claims in Firebase for Hasura
         */
        await AttachCustomClaims(new_user.id, provider_id, USER_TYPE);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Required for CORS support to work
                'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({
                user_id: new_user.id
            })
        }
    }
    catch (err) {
        console.log(err);
        /**
         * Return approprite error message if any error occurs
         */
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*', // Required for CORS support to work
                'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * Create a new YelloCab user profile 
 * @param {USER_DETAILS} data                       the profile data
 * 
 * @returns {Promise<{id: string}>} user_id         the id of the created user
 */
const CreateYelloCabProfile = async user_data => {
    /**
     * Generate GraphQL mutation for inserting a new user record
     * Details inserted are
     *  - full_name             full name of the user
     *  - country_code          country code for user mobile
     *  - mobile                mobile number of the user
     *  - type                  type of profile(`rider`)
     *  - address               any JSON data containing address details. Possible fields are
     *      - line1             self explanatory
     *      - city              self explanatory
     *      - state             self explanatory
     *      - country           self explanatory
     *      - postal_code       self explanatory
     *  - profile               any JSON content
     *  - provider              the authentication provider(FIREBASE)
     *  - provider_id           the authentication provider id of the user
     *  - verified              is the profile verified(TRUE)
     *  - active                is the profile active(TRUE)
     */
    let query = `mutation($user_data:yt_user_insert_input!){
        user: insert_yt_user_one(object: $user_data){
            id
        }
    }`;

    /**
     * Run the GraphQL query on the Hasura instance
     * Use admin secret to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                user_data
            }
        })
    }).then(res => res.json())

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly created user
     */
    return res.data.user;
}

/**
 * Type definitions
 */

 /**
  * @typedef {Object} USER_DETAILS
  * @property {string} full_name
  * @property {string} email
  * @property {string} country_code
  * @property {string} mobile
  * @property {Object} address
  * @property {Object} profile
  * @property {string} type
  */