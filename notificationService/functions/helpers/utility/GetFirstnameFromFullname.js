/**
 * Slice out the first name from the full name of the user
 * @param {string} full_name the full name
 * @returns {string} the first name 
 */
module.exports.GetFirstnameFromFullname = full_name => {
    /**
     * Get the index of the space between firstname and lastname
     * If the space between does not exist take the full length as firstname
     */
    let spaceIndex = full_name.indexOf(' ');
    if (spaceIndex === -1) {
        spaceIndex = full_name.length;
    }

    return full_name.slice(0, spaceIndex);
}