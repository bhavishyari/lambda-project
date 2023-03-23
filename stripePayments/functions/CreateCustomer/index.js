const fetch = require('node-fetch');
const s = require('stripe');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

exports.handler = async event => {
    try {
        let body = JSON.parse(event.body);
        let user_id = body.session_variables['x-hasura-user-id'];
        let user_role = body.session_variables['x-hasura-role'];

        // if sales user is requesting, get the user_id on whose behalf the request is made
        let on_behalf_of_user_id = '';
        if (user_role === 'sales')
            on_behalf_of_user_id = body.input.on_behalf_of_user_id;
        else
            on_behalf_of_user_id = user_id;

        if (user_role === 'sales' && !on_behalf_of_user_id) {
            throw new Error('Sales representative must give a valid `on_behalf_of_user_id`')
        }

        // get user data
        let userData = await GetUserProfile(on_behalf_of_user_id);
        let { metadata, full_name: name, email, address, country_code, mobile, type } = userData;

        let cusAddress = {};
        if(address){
        if (address.line1) {
            cusAddress['line1'] = address.line1; 
        }
        if (address.line2) {
            cusAddress['line2'] = address.line2; 
        }
        if (address.city) {
            cusAddress['city'] = address.city; 
        }
        if (address.country) {
            cusAddress['country'] = address.country; 
        }
        if (address.postal_code) {
            cusAddress['postal_code'] = address.postal_code+''; 
        }
    }

        // temp, override indian address..
        // cusAddress = {
        //     "city": "Rajkot",
        //     "line1": "Limda chowk",
        //     "state": "Gujarat",
        //     "country": "IN",
        //     "postal_code": "360001"
        // };

        let flagCreateCustomer = false;
        if (metadata === null) {
            metadata = {};
            flagCreateCustomer = true;
        } else if (!metadata.stripe_id) {
            flagCreateCustomer = true;
        }

        if (flagCreateCustomer === true) {
            // create the stripe profile
            let customer = await stripe.customers.create({
                address: cusAddress,
                email,
                name,
                metadata:{
                    user_id: on_behalf_of_user_id,
                    country_code: country_code,
                    mobile: mobile,
                    type: type
                }
            });

            // update user meta
            metadata.stripe_id = customer.id;
            await UpdateUserMeta(on_behalf_of_user_id, metadata);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                user_id: on_behalf_of_user_id,
                stripe_id: metadata.stripe_id
            })
        }
    }
    catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

const GetUserProfile = async (user_id) => {
    let query = `
        query ($user_id:uuid!){
            yt_user_by_pk(id:$user_id){
                id
                full_name
                email
                country_code
                mobile
                metadata
                address
                type
            }
        }
    `;

    let res = await fetch(HASURA_ENDPOINT, {
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

    return res.data.yt_user_by_pk;
}

const UpdateUserMeta = async (user_id, metadata) => {
    let query = `
        mutation($user_id:uuid!, $metadata:jsonb!){
            update_yt_user_by_pk(pk_columns:{id: $user_id}
                _set:{metadata:$metadata}){
            id
            }
        }
    `;

    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                user_id,
                metadata
            }
        })
    }).then(res => res.json())

    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res.data.update_yt_user_by_pk;
}