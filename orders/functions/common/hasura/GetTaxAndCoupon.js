const fetch = require('node-fetch');

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT               the endpoint at which Yello Taxi's Hasura instance can be connected
 *  - HASURA_ADMIN_SECRET           the Hasura engine's admin secret
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Get Tax and Coupon records
 * @param {string} user_id                                  the id of the user who is making the order
 * @param {string?} coupon_code                             the coupon code being applied
 * 
 * @returns {Promise<GET_TAX_AND_COUPON_OUTPUT>}            the tax and coupon records
 */
module.exports.GetTaxAndCoupon = async (user_id, coupon_code) => {
    if(!coupon_code){
        coupon_code = "";
    }

    let state = "NV";

    //04bb6020-f07a-418b-95aa-0b91bd619565

    const query = `
        query($state_abbr: String, $coupon_code: String){
            taxes: yt_tax(where: {
                state: {
                  abbreviation: {_eq: $state_abbr}
                }
              }){
                id
                state{
                    name
                    abbreviation
                }
                tax_code
                tax_rate
                transaction_rate
            }
              
            coupons: yt_coupon(where: {
                code: {_eq: $coupon_code}
              })
              {
                id
                code
                discount_type
                discount_value
                services
                active
                valid_from
                valid_to
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
                state_abbr: state,   // "Nevada", fixed for now.. 
                coupon_code
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * If taxation details could not be found, raise error
     */
    if (!res.data.taxes.length) {
        throw new Error(`Could not find tax details for state ${state}`);
    }

    /**
     * If coupon code is given and it does not exist, raise error
     */
    if (coupon_code && !res.data.coupons.length) {
        throw new Error(`Could not find coupon with code ${coupon_code}`);
    }

    return {
        tax: res.data.taxes[0],
        coupon: res.data.coupons[0] || null
    };
}

/**
 * Get address of a user
 * @param {string} user_id                  the id of the user to fetch address of
 * 
 * @returns {Promise<USER_ADDRESS>}         the address of the user
 */
const GetUserAddress = async (user_id) => {
    const query = `
        query($user_id: uuid!){
            user: yt_user_by_pk(id: $user_id){
                id
                address
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
                user_id
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.user) {
        throw new Error('User not found');
    }

    return res.data.user.address;
}

/**
 * @typedef {Object} USER_ADDRESS
 * @property {string} line1
 * @property {string} city
 * @property {string} state
 * @property {string} country
 * @property {string} postal_code
 */

/**
 * @typedef {Object} COUPON
 * @property {string} id                            id of the coupon record
 * @property {string} code                          the code of the coupon
 * @property {string} disount_type                  type of discount ('P' - percent | 'A' - amount)
 * @property {number} discount_value                value of discount to apply (in cents)
 * @property {Object[]} services                    service_ids for which coupon is valid
 * @property {number} max_use_global                maximum times the coupon can be used
 * @property {number} max_use_per_user              maximum times the coupon can be used by one user
 * @property {boolean} active                       is the coupon active
 * @property {Date} valid_from                      coupon validity starting time
 * @property {Date} valid_to                        coupon validity end time
 */

/**
 * @typedef {Object} TAX
 * @property {string} id                            the id of the tax record
 * @property {Object} state                         the state details where tax is being applied
 * @property {string} state.name                    the name of the state
 * @property {string} tax_code                      the tax code
 * @property {number} tax_rate                      the rate of tax to apply
 * @property {number} transaction_charge            the fixed charge to apply for every transaction
 */

/**
 * @typedef {Object} GET_TAX_AND_COUPON_OUTPUT
 * @property {TAX} tax                              the tax record
 * @property {COUPON} coupon                        the coupon record
 */