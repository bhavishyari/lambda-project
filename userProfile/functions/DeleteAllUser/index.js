const fetch = require('node-fetch');
const admin = require('firebase-admin');
const s = require('stripe');
const stripe = new s.Stripe(process.env.STRIPE_API_KEY_SECRET);
const theMoment = require('moment');

/**
 * Load the required values from ENVIRONMENT
 *  - HASURA_ENDPOINT       the public endpoint for our Hasura instance
 *  - HASURA_ADMIN_SECRET   the admin secret for HASURA
 *  - SERVICE_ACCOUNT       the Service Account details for the Firebase Admin SDK
 */
// const SERVICE_ACCOUNT = require('../../serviceAccount.json');
const SERVICE_ACCOUNT = require('../../' + process.env.FIREBASE_CREDENTIAL_FILE);
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Initialize the Firebase admin SDK with our SERVICE Account
 */
admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT)
});

/**
 * Deletes a user completely from YelloCab (hard delete)
 * @param {{body:{input:{ user_id: string }}}} event
 * 
 * @returns {{user_id: string, provider: string, provider_id: string, stripe_id: string}} the info about the deleted user
 */
module.exports.handler = async event => {
    try {

        let body = JSON.parse(event.body);


        let user_role = body.session_variables['x-hasura-role'];
        if (user_role !== 'admin') {
            throw new Error('User hard deletion must be initiated by `admin`');
        }


        await deleteAllUser();



        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "All users has been deleted"
            })
        }
    } catch (err) {
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
 * Deletes a user from Hasura (HARD DELETE)
 * @param {string} user_id the id of the user to delete from Hasura
 * @param {string} deleted_by the id of the user who deleting user
 * 
 * @returns {{id: string, provider:string, provider_id:string, metadata:{stripe_id?:string}}} the deleted user object
 */



const deleteAllUser = async () => {

    let query = `query MyQuery($type:String){
        yt_user(where: {type: {_eq: $type}}) {
          id
          provider
          provider_id
          metadata
        }
      }`;

    let type = 'rider';
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                type: type,
            }
        })
    }).then(res => res.json())

    /**
     * throw the first error if it occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }


    for(let u in res.data.yt_user){
        let user = res.data.yt_user[u];
        await DeleteHasuraUser(user.id);
        
        if (user.provider === 'FIREBASE') {
            await DeleteFirebaseUser(user.provider_id);
        }

        if (user.metadata.stripe_id) {
            await DeleteStripeCustomer(user.metadata.stripe_id);
        }

    }
   
    
    return res.data;
}
const DeleteHasuraUser = async (user_id) => {
    console.log(user_id,'user id')

    let query = `
        mutation($user_id:uuid!){
            vehicle_docs:delete_yt_vehicle_doc(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            driver_docs:delete_yt_driver_doc(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            support_requests:delete_yt_support_request(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            file_uploads:delete_yt_file_upload(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            ride_issues:delete_yt_ride_issue(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            ratings: delete_yt_rating(where:{
                _or: [
                    {
                        from_user_id:{_eq: $user_id}
                    },
                    {
                        to_user_id:{_eq: $user_id}
                    }
                ]
            }){
                affected_rows
            }
            ride_requests:delete_yt_ride_request(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            rides:delete_yt_ride(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            boarding_passes:delete_yt_boarding_pass(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            payments: delete_yt_payment(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            orders: delete_yt_order(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            push_registrations: delete_yt_push_registration(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            user_settings: delete_yt_user_setting(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            user_places: delete_yt_user_place(where:{
                user_id:{_eq:$user_id}
            }){
                affected_rows
            }
            user:delete_yt_user_by_pk(id: $user_id){
                id
                provider
                provider_id
                metadata
            }
        }
    `;

    /**
     * Run GraphQL mutation on Hasura instance
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
                user_id: user_id,
            }
        })
    }).then(res => res.json())

    console.log(res,'check response')
    /**
     * throw the first error if it occurs
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return info about the deleted Hasura user
     */

    return res.data.user;
}

/**
 * Deletes a user from Firebase
 * @param {string} uid the uid of the firebase user
 * 
 * @returns {void}
 */
const DeleteFirebaseUser = async uid => {
    /**
     * use Firebase admin SDK to delete firebase user
     */
    await admin.auth().deleteUser(uid);
}

const DeleteFirebaseUsers = async uids => {
    /**
     * use Firebase admin SDK to delete firebase users
     */
    await admin.auth().deleteUsers(uids);
}

const firebaseUserList = async () => {
    /**
     * use Firebase admin SDK to delete firebase user
     */
     let uids = []

    return  admin
     .auth()
     .listUsers()
     .then((listUsersResult) => {
       return uids.concat(listUsersResult.users.map((userRecord) => userRecord.uid))
     })
   
}





/**
 * Deletes a customer from Stripe
 * @param {*} customer_id 
 * 
 * @returns {Promise<s.Stripe.DeletedCustomer>} the deleted Stripe customer
 */
const DeleteStripeCustomer = async customer_id => {
    /**
     * use stripe SDK to delete customer
     */
    let customer = await stripe.customers.del(customer_id);

    /**
     * return the deleted customer
     */
    return customer;
}