const theMoment = require('moment');

/**
 * Validate a coupon
 * @param {COUPON} coupon the coupon to validate
 * @param {string} service_id the id of the service being purchased by the order
 * 
 * @returns {COUPON} the validated coupon
 */
module.exports.ValidateCoupon = (coupon, service_id) => {
    

    /** Check if coupon is applicable for the service*/
    if (!coupon.services.includes(service_id)) {
        throw new Error('Coupon is not applicable for this service.');
    }

    /**
     * @todo Check max usage (global and per user)
     */

    return coupon;
}

/**
 * @typedef {import ('./CreateOrder').COUPON} COUPON
 */