const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT Variables
 *  - HASURA_ENDPOINT                   the http endpoint at which Hasura GraphQL engine is
 *  - HASURA_ADMIN_SECRET               the admin secret to authorize with Hasura
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Fetch details of a rating record
 * @param {string} rating_id the id of the rating record to fetch
 * 
 * @returns {Promise<RATING>} the fetched rating record
 */
module.exports.GetRating = async rating_id => {
    /**
     * Define a GraphQL query to fetch rating details
     */
    const query = `
        query($ride_id: uuid!){
            rating: yt_rating_by_pk(id: $ride_id){
                id
                from_user{
                    id
                    full_name
                    email
                }
                to_user{
                    id
                    full_name
                    email
                }
                ride{
                    id
                    start_address
                    end_address
                    created_at
                    status
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
                rating_id
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
     * Throw if rating does not exist
     */
    if(!res.data.rating){
        throw new Error('Rating with the given id does not exist');
    }

    /**
     * Else return the fetched rating details
     */
    return res.data.rating;
}

/**
 * @typedef {Object} RATING
 * @property {string} id                            the id of the rating record
 * @property {RATING_USER} from_user                the user (driver or rider) who gave the rating
 * @property {RATING_USER} to_user                  the user (driver or rider) to whom rating is given
 * @property {RATING_RIDE} ride                     the ride referenced by the rating
 */

/**
 * @typedef {Object} RATING_USER
 * @property {string} id                            the id of the user
 * @property {string} full_name                     the full name of the user
 * @property {string} email                         the email of the user
 */

/**
 * @typedef {Object} RATING_RIDE
 * @property {string} id                            the id of the ride
 * @property {Object} start_address                 the address object detailing the starting point of the ride
 * @property {Object} end_address                   the address object detailing the ending point of the ride
 * @property {Date} created_at                      the starting timestamp of the ride
 * @property {string} status                        the status of the ride ('IN_PROGRESS' | 'COMPLETE' | 'CANCELLED')
 */