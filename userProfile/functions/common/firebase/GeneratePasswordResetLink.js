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
 * Generate a link for the user to sign in directly
 * @param {string} email                    the email of the user
 * 
 * @returns {Promise<string>}               the generated one time sign in link
 */
module.exports.GeneratePasswordResetLink = async (email, userType) => {
    const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be whitelisted in the Firebase Console.
        url: `https://yello-admin.appstudiointernal.ca/yello/password-saved?email=${email}&user_type=${userType}`,
        // This must be true.
        handleCodeInApp: true,
        // iOS: {
        //     bundleId: 'com.example.ios'
        // },
        // android: {
        //     packageName: 'com.example.android',
        //     installApp: true,
        //     minimumVersion: '12'
        // }
    };

    /**
     * Use the Admin SDK to generate a password reset link
     */
    return admin.auth().generatePasswordResetLink(email, actionCodeSettings);
}