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
 * Update a user in Firebase
 * @param {string} uid                                      the id of the firebase user
 * @param {UpdateInput} new_data                            the new details of the user
 * @param {Object}  user                                    the user object
 * 
 * @returns the updated Firebase user
 */
module.exports.UpdateFirebaseUser = async (uid, new_data, user) => {
    /**
     * @type {admin.auth.UpdateRequest}
     */
    const update_request = {};

    if (new_data.email && user.email != new_data.email) {
        update_request.email = new_data.email;
        update_request.emailVerified = false;

        /**
         * Apply random password so user can not login with password
         * 
         * NOTE: User must be sent a one-time sign in link to this new email
         */
        update_request.password = 'bh32g4328%#2b23*@#-s_32!2';
    }

    if (new_data.country_code && new_data.mobile) {
        const phoneNumber = `${new_data.country_code}${new_data.mobile}`;
        update_request.phoneNumber = phoneNumber;
    }

    if (update_request.email || update_request.phoneNumber) {
        /**
         * Use Firebase Admin SDK to update user's email
         */
        return admin.auth().updateUser(uid, update_request);
    }
    else {
        return false;
    }
}