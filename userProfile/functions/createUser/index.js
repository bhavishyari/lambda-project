const fetch = require('node-fetch');
const theMoment = require('moment');
const aws = require('aws-sdk');
const V = require('validator');

const {CreateFirebaseUser} = require('../common/firebase/CreateUser');
const {AttachCustomClaims} = require('../common/firebase/AttachCustomClaims');
// const {GenerateEmailSignInLink} = require('../common/firebase/GenerateEmailSignInLink');
const {GeneratePasswordResetLink} = require('../common/firebase/GeneratePasswordResetLink');
const VerifyOtp = require('../common/hasura/VerifyOtp');

/**
 * Load the required values from ENVIRONMENT
 *  - HASURA_ENDPOINT           the public endpoint for our Hasura instance
 *  - HASURA_ADMIN_SECRET       the admin secret for HASURA
 *  - MAIL_QUEUE_URL            the url of the AWS SQS queue for email sending
 *  - EMAIL_FROM                the email to send from
 *  - EMAIL_SIGN_IN_TEMPLATE    the SES template to use while sending sign in link email
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const MAIL_QUEUE_URL = process.env.MAIL_QUEUE_URL;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_SIGN_IN_TEMPLATE = process.env.EMAIL_SIGN_IN_TEMPLATE;

/**
 * Initialize AWS SQS service for adding email messages to queue
 */
// const sqs = new aws.SQS({
//     apiVersion: '2012-11-05',
//     accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
//     secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY
// });

/**
 * Creates a new user. This is a one stop user creation endpoint. It creates
 *  - YelloCab user
 *  - Firebase user for authentication
 *  
 *  and links them together
 */
exports.handler = async event => {
    try {
        let body = JSON.parse(event.body);


        const {
            user_role, 
            on_boarded_by, 
            full_name, 
            country_code, 
            mobile, 
            email, 
            type, 
            otp_secret, 
            otp_code 
        } = ValidateInput(body);

        /**
         * Check for existing user 
         */
        const existingUser = await GetUserByEmailOrMobile(mobile, email);
        if (existingUser.length) {
            throw new Error(`User is already exists with email or mobile number.`);
        }

        /**
         * Get & check verification code
         */
        let user_otp = {};
        if (type == 'rider') {
            user_otp = await VerifyOtp.execute(mobile, otp_code, otp_secret);
        }

        const user_id = await CreateNewUser(full_name, email, country_code, mobile, type, on_boarded_by, user_otp.id);

        /**
         * generate password set/reset link
         */
        passwordSetLink = null;
        if (email) {
            passwordSetLink = await GeneratePasswordResetLink(email, type);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                user_id,
                passwordSetLink
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
 * Validate input
 * 
 * @param {Object} body
 * 
 * @returns {Object}
 */
const ValidateInput = body => {

    const { full_name, country_code, mobile, email, type, otp_secret, otp_code } = body.input;

    /**
     * The id of the sales user onboarding this new user.
     *  - If called by `admin`, this is set to null
     */
    const on_boarded_by = body.session_variables['x-hasura-user-id'] || null;

    /**
     * user role
     */
    const user_role = body.session_variables['x-hasura-role'];

    /**
     * role check
     */
    if (!['driver', 'sales', 'admin'].includes(user_role)) {
        throw new Error('You are not authorized to create new user.');
    }

    /**
     * Check `type` to confirm standard values.
     * It can take values `rider` | `sales` | `driver` only
     */
    if (!['rider', 'sales', 'driver'].includes(type)) {
        throw new Error(`Type can only be 'rider', 'sales' or 'driver'`);
    }

    /**
     * rider related checks
     */
    if (type == 'rider') {
        if (!otp_secret) {
            throw new Error('Verification secret is required.');
        }

        if (!otp_code) {
            throw new Error('Verification code is required.');
        }

        if (!mobile) {
            throw new Error('Mobile is required.');
        }
    }

    /**
     * check email, if type is sales and driver
     */
    if (['sales', 'driver'].includes(type) && email === undefined) {
        throw new Error(`Email is required for 'sales' or 'driver' type.`);
    }

    /**
     * Prohibit sales users to create more sales users.
     * Only `admin` can create `sales` user.
     */
    if (user_role === 'sales' && type === 'sales') {
        throw new Error(`Sales representative can not create 'sales' users`);
    }

    if (full_name === undefined || V.isEmpty(full_name + '', {ignore_whitespace: false})) {
        throw new Error('Full name is required.');
    }

    if (email) {
        if (V.isEmail(email) === false) {
            throw new Error(`${email} is not valid email address.`);
        }
    }

    if (!mobile) {
        throw new Error('Mobile is required.');
    } else if (V.isMobilePhone(country_code+''+mobile, ['en-IN', 'en-US'], {strictMode: true}) === false ) {
        throw new Error('Mobile number is not valid');
    }

    return {
        user_role, 
        on_boarded_by, 
        full_name, 
        country_code, 
        mobile, 
        email, 
        type, 
        otp_secret, 
        otp_code
    };
}


/**
 * Create a new user
 * @param {string} full_name                the full name of the user to create
 * @param {string} email                    the email of the user to create
 * @param {string} country_code             the country code for the phone of the user to create
 * @param {string} mobile                   the mobile number of the user to create
 * @param {string} type                     the type of the user to create ('driver' | 'sales')
 * @param {string} on_boarded_by            the id of the sales user onboarding this user
 * @param {string} user_otp_id              the id of user_otp
 * @returns {string}                        the newly created user's id
 */
const CreateNewUser = async (full_name, email, country_code, mobile, type, on_boarded_by, user_otp_id) => {
    /**
     * create a firebase user
     */
    const phone = `${country_code}${mobile}`;
    let firebase_id = await CreateFirebaseUser(full_name, email, phone);

    /**
     * create a linked hasura user with specified type
     */
    let hasura_user = await CreateHasuraUser(full_name, country_code, mobile, email, firebase_id, type, on_boarded_by, user_otp_id);

    /**
     * attach custom claims for the specified type in firebase
     */
    await AttachCustomClaims(hasura_user.id, firebase_id, type);

    // /**
    //  * Send one time sign in link
    //  */
    // await SendEmailSignInLink(email, full_name);

    return hasura_user.id;
}



/**
 * Creates a YelloCab user in Hasura
 * @param {string} full_name                    the full name of the Hasura user
 * @param {string} country_code                 the user's phone number's country code
 * @param {string} mobile                       the user's 10 digit mobile number
 * @param {string} email                        the user's email
 * @param {string} firebase_id                  the uid of the firebase user
 * @param {string} type                         the type of user 'sales' | 'driver'
 * @param {string} on_boarded_by                the user who is onboarding this new user
 * @param {string} user_otp_id                  the id of user_otp
 * 
 * @returns {Promise<{id:{string}}>}            the id of the YelloTaxi user
 */
const CreateHasuraUser = async (full_name, country_code, mobile, email, firebase_id, type, on_boarded_by, user_otp_id) => {
    

    let user_object = {
        full_name: full_name,
        country_code: country_code,
        mobile: mobile,
        // email: email,
        type: type,
        provider: "FIREBASE",
        provider_id: firebase_id,
        verified: true,
        active: true,
        on_boarded_by: on_boarded_by
    };

    if (email) {
        user_object.email = email;
    }

    let current_time = theMoment().utc().toISOString();

    /**
     * Generate the GraphQL mutation for inserting a new user
     * The details inserted are
     *  - full_name             the full name of the user
     *  - type                  the type of the user (`sales` | `driver`)
     *  - country_code          the country code for mobile of the user
     *  - mobile                the mobile number of the user
     *  - email                 the email of the user
     *  - provider              the authentication provider (`FIREBASE`)
     *  - provider_id           the authentication provider given user id
     *  - verified              is the profile verified (TRUE)
     *  - active                is the profile active (TRUE)
     *  - on_boarded_by         the id of the sales user onboarding this new user
     */
    let query = '';
    let variables = {};

    if (user_otp_id) {
        query = `
            mutation($user_object:yt_user_insert_input!, $user_otp_id:uuid!, $current_time:timestamp!){

                user: insert_yt_user_one(object: $user_object){
                    id
                }

                user_otp: update_yt_user_otp_by_pk(
                    pk_columns: {id: $user_otp_id}, 
                    _set: {used_at: $current_time}
                ) {
                    id
                }
            }
        `;

        variables = {
            user_object: user_object,
            user_otp_id: user_otp_id,
            current_time: current_time
        };

    } else {
        query = `
            mutation($user_object:yt_user_insert_input!){

                user: insert_yt_user_one(object: $user_object){
                    id
                }

            }
        `;

        variables = {
            user_object: user_object
        };
    }

    /**
     * Run the GraphQL mutation on the Hasura instance
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
            variables: variables
        })
    }).then(res => res.json());

    /**
     * Throw the first error if one occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly inserted user
     */
    return res.data.user;
}


/**
 * Get user by email or mobile
 * 
 * @param {string} mobile       the mobile number, without country code
 * @param {string} email        the email address
 */
const GetUserByEmailOrMobile = async (mobile, email) => {

    let where = null;
    if (mobile && email) {
        where = {
            _or: [
                    {mobile: {_eq: mobile}},
                    {email: {_eq: email}}   
                ]
            };
    } else {
        where = {
            _or: [
                    {mobile: {_eq: mobile}}
                ]
            };
    }

    let query = `
        query MyQuery($where:yt_user_bool_exp!) {
            users: yt_user(
                where: $where
            ) {
            id
            country_code
            mobile
            email
            }
        }
    `;

    /**
     * Run the GraphQL mutation on the Hasura instance
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
                where
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
     * Else return the found users
     */
    return res.data.users;
}

// /**
//  * Create Email for sending sign in link to user and add it to SQS Queue
//  * @param {string} email            the email of the user
//  * @param {string} firstname        the firstname of the user
//  */
// const SendEmailSignInLink = async (email, fullname) => {
//     /**
//      * Generate the one time Sign in Link for the email
//      */
//     const signInLink = await GenerateEmailSignInLink(email);

//     // console.log('CreateUser : SendEmailSignInLink : signInLink : ', signInLink);

//     /**
//      * Slice out firstname from full name
//      */
//     let spaceIndex = fullname.indexOf(' ');
//     if (spaceIndex === -1)
//         spaceIndex = fullname.length;

//     const firstname = fullname.slice(0, spaceIndex);

//     /**
//      * Construct the sign in link message and add it to queue
//      */
//     const message = {
//         Sender: 'aws-ses',
//         Source: EMAIL_FROM,
//         Template: EMAIL_SIGN_IN_TEMPLATE,
//         ConfigurationSetName: 'ConfigSet',
//         ToAddresses: [email],
//         CcAddresses: [],
//         BccAddresses: [],
//         TemplateData: {
//             signInLink,
//             firstname
//         }
//     };

//     /**
//      * Use AWS SDK to insert a email notification message to Queue
//      */
//     let result = await sqs.sendMessage({
//         MessageBody: JSON.stringify(message),
//         QueueUrl: MAIL_QUEUE_URL
//     }).promise();

//     return result;
// }

