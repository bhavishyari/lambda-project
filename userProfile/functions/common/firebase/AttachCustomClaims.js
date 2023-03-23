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
 * AttachCustomClaims attaches custom Hasura claims to a firebase user
 * @param {string} hasura_user_id                       the uuid of the hasura user
 * @param {string} firebase_user_id                     the uid of the firebase user
 * @param {string} role                                 the hasura role to assign
 * 
 * @returns {Promise<void>} a promise indicating the success of the claims attachment
 */
module.exports.AttachCustomClaims = async (hasura_user_id, firebase_user_id, role) => {
    /**
     * Create custom claims for Hasura.
     * This claims will allow the Firebase user to authenticate and authorize with YelloCab Hasura instance.
     * Custom claims will include 
     *  - x-hasura-default-role     the default role for the YelloCab user
     *  - x-hasura-allowed-roles    the list of allowed roles for YelloCab Hasura
     *  - x-hasura-user-id          the id of the YelloCab user
     */
    const hasuraClaims = {
        "https://hasura.io/jwt/claims": {
            "x-hasura-default-role": role,
            "x-hasura-allowed-roles": [role],
            "x-hasura-user-id": hasura_user_id
        }
    }

    /**
     * Use the Firebase Admin SDK to set the custom claims
     */
    await admin.auth().setCustomUserClaims(firebase_user_id, hasuraClaims);
}