const admin = require('firebase-admin');
// const SERVICE_ACCOUNT = require('../../../serviceAccount.json');
const SERVICE_ACCOUNT = require('../../../' + process.env.FIREBASE_CREDENTIAL_FILE);

/**
 * Initialize the Firebase admin SDK with our SERVICE Account if NOT already done
 */
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT)
    });
}

/**
 * Create a new firebase user with name and email
 * @param {string} displayName                  the full name of the user
 * @param {string} email                        the email of the user
 * @param {string} phoneNumber                  the phone number of the user 
 * 
 * @returns {Promise<string>} the id of the newly created Firebase user
 */
module.exports.CreateFirebaseUser = async (displayName, email, phoneNumber) => {
    /**
     * @type {admin.auth.CreateRequest}
     */
    let createUserParams = {
        displayName,
        phoneNumber
    };

    if (email) {
        createUserParams.email = email;
    }

    /**
     * create a user in Firebase using the Admin SDK with the details provided
     */
    let user = await admin.auth().createUser(createUserParams);

    /**
     * Returns the id of the Firebase user
     */
    return user.uid;
}