const fetch = require('node-fetch');
const SQS = require('../common/sqs');

/**
 * Load the environment variables
 *  - HASURA_ENDPOINT           the endpoint at which Yello Taxi Hasura instance exists
 *  - HASURA_ADMIN_SECRET       the admin secret for the Yello Taxi Hasura instance
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {

    try {
        const body = JSON.parse(event.body);

        /**
         * Get search inputs for filtering users
         */
        const { country_code, mobile } = ValidateInput(body);


        /**
         * generate and save opt in user_opt table
         */
        let user_otp = await CreateOtp(country_code, mobile);


        /**
         * send sms
         */
        let sms = await SQS.sendOtpSms(
            {
                "Message": `Yello verification code: ${user_otp.code}`,
                "PhoneNumber": `${country_code}${mobile}`
            }
        );

        console.log('sms queue response : ', sms);

        /**
         * send response back to hasura
         */
        return {
            statusCode: 200,
            body: JSON.stringify({
                user_otp: {
                    secret: user_otp.secret,
                    country_code: user_otp.country_code,
                    mobile: user_otp.mobile,
                    valid_from: user_otp.valid_from,
                    valid_to: user_otp.valid_to,
                    // sms_sqs: sms
                }
            })
        };
    }
    catch (err) {

        console.log(err);
        
        /**
         * send error response to hasura
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
 * Create OTP
 * @param {string} country_code                     the country code
 * @param {string} mobile                           the mobile number
 * 
 * @returns {Promise<User[]>}                       return user_otp record
 */
const CreateOtp = async (country_code, mobile) => {

    let code = Math.floor(100000 + Math.random() * 900000) + ""; // random 6 digit number in string

    const query = `
        mutation CreateOtp($code:String!, $country_code:String!, $mobile:String!) {
            user_otp: insert_yt_user_otp_one(
                object: {
                    code: $code, 
                    country_code: $country_code, 
                    mobile: $mobile
                }
                ) {
                    id
                    country_code
                    code
                    mobile
                    secret
                    user_id
                    valid_from
                    valid_to
                    used_at
                    updated_at
                    created_at
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
                code,
                country_code,
                mobile
            }
        })
    }).then(res => res.json());

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res.data.user_otp;
}

/**
 * Validate request
 * 
 * @param {Object} body 
 */
const ValidateInput = body => {

    const user_id = body.session_variables['x-hasura-user-id'];
    const user_role = body.session_variables['x-hasura-role'];


    const {country_code, mobile} = body.input;
    let regx_country_code = new RegExp("^[+]{1}[0-9]{1,4}$");

    if (!country_code) {
        throw new Error('Country code is required.');
    } else if (regx_country_code.test(country_code) === false) {
        throw new Error('Invalid country code.');
    }

    
    let regx_mobile = new RegExp("^\\d{10}$");
    if (!mobile) {
        throw new Error('Mobile number is required.');
    } else if ( regx_mobile.test(mobile) === false) {
        throw new Error('Invalid mobile number, only 10 digit mobile number is allowed.');
    }


    if (!['admin', 'driver', 'sales'].includes(user_role)) {
        throw new Error('You are not authorized to get device token.');
    }

    return { country_code, mobile, user_id, user_role };
}
