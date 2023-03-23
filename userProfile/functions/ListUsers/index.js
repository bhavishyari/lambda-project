const fetch = require('node-fetch');
const { GetSignedUrl } = require('../common/s3/GetSignedUrl');

/**
 * Load the environment variables
 *  - HASURA_ENDPOINT           the endpoint at which Yello Taxi Hasura instance exists
 *  - HASURA_ADMIN_SECRET       the admin secret for the Yello Taxi Hasura instance
 *  - AWS_S3_BUCKET             the name of the bucket where profile photo files are stored
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * Get search inputs for filtering users
         */
        const { where, offset, limit, order_by } = body.input;

        /**
         * Search for users in Hasura
         */
        const users = await SearchUsers(where, offset, limit, order_by);

        /**
         * Hydrate users who have a profile photo
         */
        for (let i = 0; i < users.length; i++) {
            users[i] = await HydrateUser(users[i]);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(users)
        };
    }
    catch (err) {
        console.log(err);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * Searches user in Yello Taxi's Hasura engine
 * @param {any} where                                                   postgres filter condition for yt.user table
 * @param {number} limit                                                maximum number of records to fetch
 * @param {number} offset                                               number of records to skip 
 * @param {any} order_by                                                postgres order condition for yt.user table
 * 
 * @returns {Promise<User[]>}                                             the fetched user record promise
 */
const SearchUsers = async (where, limit, offset, order_by) => {
    const query = `
        query($where: yt_user_bool_exp, $offset: Int, $limit: Int, $order_by: [yt_user_order_by!]){
            users: yt_user(
                where: $where
                offset: $offset
                limit: $limit
                order_by: $order_by
            ){
                id
                full_name
                email
                country_code
                mobile
                address
                profile
                active
                profile_photo{
                    file_object
                }
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
                where,
                offset,
                limit,
                order_by
            }
        })
    }).then(res => res.json());

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res.data.users;
}

/**
 * Hydrates the profile photo view url for a user
 * @param {User} user the user record to hydrate
 * 
 * @returns the hydrated user
 */
const HydrateUser = async user => {
    if (user.profile_photo) {
        /**
         * Generate signed view url for the photo file
         */
        const photo_url = await GetSignedUrl(user.profile_photo.file_object.key);

        user.profile_photo = { photo_url };
    }

    return user;
}

/**
 * The user object
 * @typedef {Object} User
 * @property {string} id                                                the id of the user
 * @property {string} full_name                                         the full name of the user
 * @property {string} email                                             the email address of the user
 * @property {string} country_code                                      the country code for user's phone
 * @property {string} mobile                                            the user's phone number
 * @property {any} address                                              the user's address record object
 * @property {any} profile                                              the user's profile record object
 * @property {boolean} active                                           is the user active
 * @property {Object} profile_photo                                     the user's profile photo object
 * @property {string?} profile_photo.photo_url                           the signed view url for the photo
 * @property {Object?} profile_photo.file_object                         the file details of the photo
 * @property {string} profile_photo.file_object.key                     the filename as on AWS S3 storage
 * @property {string} profile_photo.file_object.original_filename       the original filename
 */