const fetch = require('node-fetch');
const aws = require('aws-sdk');
const { GeneratePasswordResetLink } = require('../common/firebase/GeneratePasswordResetLink');
const { UpdateFirebaseUser } = require('../common/firebase/UpdateFirebaseUser');

/**
 * Load the required values from ENVIRONMENT
 *  - HASURA_ENDPOINT                   the public endpoint for our Hasura instance
 *  - HASURA_ADMIN_SECRET               the admin secret for HASURA
 *  - MAIL_QUEUE_URL                    the url of the AWS SQS queue for email sending
 *  - EMAIL_FROM                        the email to send from
 *  - EMAIL_VERIFICATION_TEMPLATE       the SES template to use while sending email verification link
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const MAIL_QUEUE_URL = process.env.MAIL_QUEUE_URL;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_VERIFICATION_TEMPLATE = process.env.EMAIL_VERIFICATION_TEMPLATE;

/**
 * Initialize AWS SQS service for adding email messages to queue
 */
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
    // ,
    // accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    // secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY
});

exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);
        const { user_id, full_name, email, country_code, mobile,dob } = body.input;

        const updating_user_id = body.session_variables['x-hasura-user-id'];

        //const updating_user_id = "e5a1cd1b-6a6c-49e9-a9d9-417280c5392d"; // sales user.. test only
        
        if (!full_name && !email && !country_code && !mobile) {
            throw new Error('You must provide at least one user field to update.');
        }

        /**
         * Update user's email and/or mobile and send a verification link to the new email (if updated)
         */
        let updatedUser = await UpdateUser(user_id, { full_name, email, country_code, mobile,dob }, updating_user_id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                user_id,
                user: updatedUser
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
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * Update a user data
 * @param {string} update_user_id               the id of the user to update
 * @param {UpdateInput} new_data                the new data for the user
 * @param {string} updating_user_id             the id of the user who is updating
 * @param {string} updating_user_role           the role of the user who is updating
 * 
 * @returns {Object} updated user record
 */
const UpdateUser = async (update_user_id, new_data, updating_user_id) => {
    /**
     * Fetch user details
     */
    const user = await GetHasuraUser(update_user_id);

    /**
     * Only upon meeting one of the following conditions can a user be updated
     *  - User is updating their own profile.
     *  - Sales user is updating any user that they have onboarded
     */
    if (updating_user_id) {
        if(updating_user_id !== user.id && 
            updating_user_id !== user.on_boarded_by) {
            throw new Error('UNAUTHORIZED: You are not authorized to update the user');
        }
    }

    /**
     * Update user details in Firebase
     */
    await UpdateFirebaseUser(user.provider_id, new_data, user);

    /**
     * Update user email in Hasura instance and Send verification link to new email
     */
    let updatedUser = await UpdateHasuraUser(update_user_id, new_data);

    if (new_data.email && user.email != new_data.email) {
        await SendEmailVerificationLink(new_data.email, user.full_name, user.type);
    }

    return updatedUser;
}


/**
 * Get User details
 * @param {string} user_id                      the id of he user
 * 
 * @returns {User}                              the fetched user details
 */
const GetHasuraUser = async (user_id) => {
    /**
     * Define a GraphQL query to fetch user details
     * Details fetched are
     *  - id
     *  - full_name
     *  - email
     *  - provider
     *  - provider_id
     */
    const query = `
        query($user_id: uuid!){
            user: yt_user_by_pk(id: $user_id){
                id
                full_name
                email
                dob
                country_code
                mobile
                type
                provider
                provider_id
                on_boarded_by
            }
        }
    `;

    /**
     * Run the GraphQL mutation on the Hasura instance
     * Use admin secret to authorize
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
                user_id
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
     * Else return the fetched user
     */
    return res.data.user;
}



/**
 * Update user data in Yello Taxi database
 * @param {string} user_id                      the id of the user to update
 * @param {UpdateInput} new_data                the new details of the user
 * 
 * @returns {Promise<{id: string}>}             the updated user
 */
const UpdateHasuraUser = async (user_id, new_data) => {
    /**
     * Define a GraphQL muatation to update a user
     */
    const query = `
        mutation ($user_id: uuid!, $new_data: yt_user_set_input!) {
            user: update_yt_user_by_pk(
                pk_columns: {id: $user_id}, 
                _set: $new_data
            ) {
                id
                full_name
                email
                dob
                country_code
                mobile
                profile_photo_file_id
                type
                average_rate
                created_at
                updated_at
            }
        }
    `;

    /**
     * Run the GraphQL mutation on the Hasura instance
     * Use admin secret to authorize
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
                user_id,
                new_data
            }
        })
    }).then(res => res.json());

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the updated user
     */
    return res.data.user;
}

/**
 * Create Email for sending email verification link
 * @param {string} email                            the unverfied email of the user
 * @param {string} firstname                        the firstname of the user
 */
const SendEmailVerificationLink = async (email, fullname, type) => {
    /**
     * Generate the one time Sign in Link for the email
     */
    const verification_link = await GeneratePasswordResetLink(email, type);

    /**
     * Slice out firstname from full name
     */
    let spaceIndex = fullname.indexOf(' ');
    if (spaceIndex === -1)
        spaceIndex = fullname.length;

    const firstname = fullname.slice(0, spaceIndex);

    /**
     * Construct the sign in link message and add it to queue
     */
    const message = {
        Sender: 'aws-ses',
        Source: EMAIL_FROM,
        Template: EMAIL_VERIFICATION_TEMPLATE,
        ConfigurationSetName: 'ConfigSet',
        ToAddresses: [email],
        CcAddresses: [],
        BccAddresses: [],
        TemplateData: {
            verification_link,
            firstname
        }
    };

    /**
     * Use AWS SDK to insert a email notification message to Queue
     */
    let result = await sqs.sendMessage({
        MessageBody: JSON.stringify(message),
        QueueUrl: MAIL_QUEUE_URL
    }).promise();

    return result;
}

/**
 * Type definitions
 */

/**
 * @typedef {Object} User
 * @property {string} id                        the id of the user
 * @property {string} full_name                 the full name of the user
 * @property {string} email                     the email of the user
 * @property {string} country_code              the country code for user's mobile number
 * @property {string} mobile                    the user's mobile number
 * @property {string} type                      the user's type ('rider' | 'driver' | 'sales' )
 * @property {string} provider                  the authentication provider of the user ('FIREBASE')
 * @property {string} provider_id               the authentication provider's id for the user
 * @property {string} on_boarded_by             the sales user who onboarded this user
 */

/**
 * @typedef {Object} UpdateInput
 * @property {string?} full_name
 * @property {string?} email
 * @property {string?} country_code
 * @property {string?} mobile
 */