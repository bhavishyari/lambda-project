const uuidV4 = require('uuid').v4;

const { StoreOrder } = require('./hasura/StoreOrder');
const { GetTaxAndCoupon } = require('./hasura/GetTaxAndCoupon');
const { ValidateCoupon } = require('./ValidateCoupon');

/**
 * @typedef {import('./hasura/StoreOrder').ORDER} ORDER
 * @typedef {import('./hasura/GetTaxAndCoupon').COUPON} COUPON
 * @typedef {import('./hasura/GetTaxAndCoupon').TAX} TAX
 */

/**
 * Creates a new order for the purchase
 * @param {string} user_id                      the id of the user purchasing the boarding pass
 * @param {string | null} created_by            the id of the sales user creating this order for the user
 * @param {number} amount                       the gross amount of the order
 * @param {string} service_id                   the id of the service for this order
 * @param {Object} service_details              metadata about the associated service
 * @param {string?} coupon_code                 the coupon code to apply
 * @param {Object} commission_details           metadata about the commission to sales or driver user
 * 
 * @returns {Promise<ORDER>}the newly created order
 */
module.exports.CreateOrder = async (user_id, created_by, amount, service_id, service_details = {}, coupon_code = null, commission_details = {}) => {


    let plan_id = null;
    if (service_details.purchase_plan) {
        plan_id = service_details.purchase_plan;
    } else if (service_details.boarding_pass_plan_id) {
        plan_id = service_details.boarding_pass_plan_id;
    }

    /**
     * @type {ORDER}
     */
    const order_details = {
        id: uuidV4(),
        plan_id,
        user_id,
        amount,
        service_id,
        created_by,
        status: 'ORDER_CREATED',
        service_details,
        commission_details
    };

    /**
     * check tax and discount is applicable or not
     */
    let applyTaxAndDiscount = true;
    if (service_details.hasOwnProperty('purchase_tip_for_ride')) {
        applyTaxAndDiscount = false;
    }

    if (applyTaxAndDiscount) {
        
        /**
         * Calculate, and apply DISCOUNT and TAX
         */
        var { net_amount, tax_details, discount_details, coupon } = await CalculateTaxAndDiscount(service_id, user_id, amount, coupon_code);

    } else {

        /**
         * no tax and no discount
         */
        var { net_amount, tax_details, discount_details } = {
            net_amount: amount,
            tax_details: {
                before_tax_amount: amount,
                tax_amount: 0.00,
                after_tax_amount: amount,
                transaction_charge: 0.00
            },
            discount_details: {
                before_discount: amount,
                discount_value: 0.00,
                after_discount: amount
            },
            coupon: null
        }
    }

    
    order_details.discount = discount_details ? discount_details.discount_value : 0.00;
    order_details.discount_details = discount_details;

    order_details.tax = tax_details.tax_amount;
    order_details.transaction_charge = tax_details.transaction_charge;
    order_details.tax_details = tax_details;

    order_details.net_amount = parseFloat(net_amount.toFixed(2));


    let coupon_details = null;
    if (coupon) {
        coupon_details = {
            coupon_id: coupon.id,
            order_id: order_details.id,
            user_id: user_id,
            discount: order_details.discount
        }
    }


    console.log({ order_details, coupon_details });
    
    /**
     * Store the order in Yello Taxi's Hasura instance
     */
    const order = await StoreOrder(order_details, coupon_details);

    return order;
}

/**
 * Calculate Tax and apply Coupon to order amount
 * @param {string} service_id                                           the id of the service being purchased
 * @param {string} user_id                                              the id of the user making the order
 * @param {number} amount                                               the gross amount of the order
 * @param {string?} coupon_code                                         the coupon code if applied
 * 
 * @returns {Promise<CALCULATE_TAX_AND_DISCOUNT_OUTPUT>}                the net amount of the order
 */
const CalculateTaxAndDiscount = async (service_id, user_id, amount, coupon_code) => {
    const { tax, coupon } = await GetTaxAndCoupon(user_id, coupon_code);

    /**
     * Calculate and apply coupon discount
     */

    console.log(amount,'before coupon amount')
    const discount_details = await ApplyCoupon(service_id, coupon, amount);
    amount = discount_details.after_discount;
    console.log(amount,'after apply coupon amount')

    /**
     * Calculate and apply tax and add transaction charge
     */
    let tax_details = await ApplyTax(tax, amount);

    console.log(tax_details.after_tax_amount,'after apply tax amount')

    const net_amount = tax_details.after_tax_amount + tax_details.transaction_charge;
    console.log(net_amount,'after apply tax amount')

    return {
        net_amount,
        discount_details,
        tax_details,
        coupon
    };
}

/**
 * Apply a coupon to order amount
 * @param {string} service_id the id of the service being purchased
 * @param {COUPON} coupon the coupon to apply
 * @param {number} amount he amount before coupon
 * 
 * @returns {DISCOUNT_DETAILS | null}
 */
const ApplyCoupon = (service_id, coupon, amount) => {
    if (!coupon) {
        return {
            before_discount: amount,
            discount_value: 0.00,
            after_discount: amount
        };
    }

    /**
     * Validate coupon
     */
    ValidateCoupon(coupon, service_id);

    /**
     * Calculate and apply coupon discount
     */
    let discount = 0;
    switch (coupon.discount_type) {
        case 'P':
            /** Percent discount */
            discount = (coupon.discount_value * amount) / 100;
            break;
        case 'A':
            /** Amount discount */
            discount = coupon.discount_value;
            break;
    }

    discount = parseFloat(discount.toFixed(2));

    console.log(discount,'discount amount')


    let after_discount = amount - discount;

    console.log(after_discount,'after discount amount inside function')

    /**
     * Round off to zero decimal values (we are calculating amount in cents)
     */
    after_discount = parseFloat(after_discount.toFixed(2));

    /** @type {DISCOUNT_DETAILS} */
    const discount_details = {
        coupon_code: coupon.code,
        discount_type: coupon.discount_type,
        before_discount: amount,
        discount_value: discount,
        after_discount
    };

    return discount_details;

}

/**
 * Apply tax to an order
 * @param {TAX} tax the tax record to apply
 * @param {number} amount the order amount before applying tax
 * 
 * @returns {TAX_DETAILS}
 */
const ApplyTax = (tax, amount) => {
    /**
     * Calculate and add tax
     */
    let tax_value = (amount * tax.tax_rate) / 100;

    console.log(tax_value,'tax_value before')

    tax_value = parseFloat(tax_value.toFixed(2));
    console.log(tax_value,'tax_value after')


    let after_tax = amount + tax_value;
    console.log(after_tax,'after after_tax')


    /**
     * calculate transaction charge
     */
    let transaction_charge = (amount * tax.transaction_rate) / 100;

    console.log(transaction_charge,'transaction_charge')

    transaction_charge = parseFloat(transaction_charge.toFixed(2));

    console.log(transaction_charge,'after parseFloat transaction_charge')

    /**
     * Round off to two decimal values
     */
    after_tax = parseFloat(after_tax.toFixed(2));


    
    return {
        tax_state: tax.state.name,
        tax_state_abbreviation: tax.state.abbreviation,
        tax_code: tax.tax_code,
        tax_rate: tax.tax_rate,
        before_tax_amount: amount,
        tax_amount: tax_value,
        after_tax_amount: after_tax,
        transaction_charge: transaction_charge
    };
}

/**
 * @typedef {Object} DISCOUNT_DETAILS
 * @property {string} coupon_code                   the code of the coupon applied
 * @property {number} before_discount               the order amount before discount
 * @property {number} discount_value                the discount value
 * @property {number} after_discount                the order value after discount
 */

/**
 * 
 * @typedef {Object} TAX_DETAILS
 * @property {string} tax_state                     the state where tax is being applied
 * @property {string} tax_state_abbreviation
 * 
 * @property {string} tax_code                      the code of the tax applied
 * @property {number} tax_rate                      the tax rate applied
 * @property {number} before_tax_amount             the order amount before tax
 * @property {number} tax_amount                    the tax value applied,
 * @property {number} transaction_charge            the fixed transaction charge applied
 * @property {number} after_tax_amount              the order amount after tax
 */

/**
 * @typedef {Object} CALCULATE_TAX_AND_DISCOUNT_OUTPUT
 * @property {number} net_amount                    the final amount payable for the order
 * @property {TAX_DETAILS} tax_details              the tax details
 * @property {DISCOUNT_DETAILS} discount_details    the discount details
 */
