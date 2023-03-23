const fetch = require('node-fetch');

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

    // Validate request body
    const {
      user_role,
      user_id,
      driver_user_id,
    } = ValidateInput(body);

    // check driver user id
    if (!driver_user_id) {
      throw new Error('Driver user id is required.');
    }

    // get driver profile data
    const response = await GetDriverProfile(driver_user_id);

    if (response.user.length <= 0) {
      throw new Error('Driver user not found.');
    }

    // user: jsonb!
    // rating: jsonb!
    // ride_aggregate: jsonb!
    // rating_aggregate: jsonb!
    return {
      statusCode: 200,
      body: JSON.stringify({
        user: response.user,
        rating: response.rating,
        ride_aggregate: response.ride_aggregate,
        rating_aggregate: response.rating_aggregate,
        tip_aggregate: response.tip_aggregate
      })
    };

  } catch (err) {
    // console.log(err);
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

  const { driver_user_id } = body.input;

  /**
   * id of the current user, null if admin
   */
  const user_id = body.session_variables['x-hasura-user-id'] || null;

  /**
   * user role
   */
  const user_role = body.session_variables['x-hasura-role'];

  /**
   * role check
   */
  if (!['admin', 'rider'].includes(user_role)) {
    throw new Error('You are not authorized to get driver profile.');
  }

  return {
    user_role,
    user_id,
    driver_user_id    
  };
}


/**
 * Get driver profile
 * 
 * @param {string} driver_id        the id of driver user
 * 
 * @returns {Object}                the fetched driver user record
 */
const GetDriverProfile = async (driver_id) => {

  /**
   * GraphQL query to get data
   */
  const query = `

        query MyQuery($driver_id: uuid!) {

            user: yt_user(
              where: { 
                id: { _eq: $driver_id },
                type: { _eq: "driver" },
                deleted_at: {_is_null: true}
              }
            ) {
              id
              full_name
              country_code
              mobile
              profile_photo_file_id
              created_at
              average_rate
              vehicles {
                name
                registration_number
              }
            }

            rating: yt_rating(
              where: { 
                to_user_id: { _eq: $driver_id },
                is_approved: { _eq: true }
              }
            ) {
              id
              comment
              given_rate
              created_at
            }

            rating_aggregate: yt_rating_aggregate(
              where: { 
                to_user_id: { _eq: $driver_id }, 
                is_approved: { _eq: true } 
              }
            ) {
              aggregate {
                count(columns: id)
              }
            }

            
            tip_aggregate: yt_user_wallet_aggregate(
              where: { 
                user_id: { _eq: $driver_id }, 
                context: { _eq: "TIP" } 
              }
            ) {
              aggregate {
                sum {
                  amount
                }
              }
            }

            ride_aggregate: yt_ride_aggregate(
              where: { 
                driver_user_id: { _eq: $driver_id }, 
                status: { _eq: "COMPLETE" } 
              }
            ) {
              aggregate {
                count(columns: id)
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
        driver_id
      }
    })
  }).then(res => res.json());

  if (res.errors) {
    throw new Error(res.errors[0].message);
  }

  return res.data;
}
