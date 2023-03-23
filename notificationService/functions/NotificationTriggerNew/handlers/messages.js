const { SMS } = require("aws-sdk");

module.exports = {
    NOTIFICATION: {
        "pass_purchased": "Thanks for purchasing <pass_name> for Yello. This pass gives you <number_of_rides> rides for <time> days after your first ride. We hope to see you onboard soon!!",
        "pass_expired": "We hope you enjoyed riding with Yello. Your <pass_name> has expired. If you would like to continue riding with Yello feel free to purchase a new pass from the app.",
        "ride_booked": "Your Yello is on the way!! <driver_name> will chauffeur you to your desired destination. Please look out for him in a Yello with Number <car_number>. You can also call him on <driver_contact_number> to get connected. Happy Riding!!",
        "driver_arriving_soon": "<driver_name> is just around the corner in a Yello with license plate no. <license_number> Please get ready to experience the joy of riding Yello!!!",
        "driver_has_arrived": "<driver_name> has arrived and waiting for you at your location in a Yello with Licence Plate no. <license_number> Please call him on <driver_contact_number> if you are facing any trouble locating your chauffeur.",
        "ride_finished_rate": "We hope you enjoyed your time riding Yello!!! Please provide us your feedback which helps us improve our services. Hope to see you soon on a Yello!!",
        "on_a_ride_pass_expiring_soon": "NO, Your current pass is expiring very soon!! If you want to continue riding yello feel free to ask your chauffer to extend your pass during the ride.",
        "ride_cancelled": "Oops! The driver had to cancel your ride due to some unavoidable circumstances. Please go to Yello App and book another ride and we promise to help you reach your destination shortly.",
        "welcome_user": "Welcome to Yello <username>!! We are here to make your commute an enjoyable experience. Click on the link here to log in and request a new Yello now - <link>"
    },
  
}