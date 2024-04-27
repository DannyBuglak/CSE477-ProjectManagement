/**
 * JavaScript file handling the registering of a user. Handle errors
 */

// Get the register button
const registerButton = document.getElementById("register-btn");

registerButton.addEventListener(
    'click',
    function() {
        // Extract data from the inputs
        const email = document.querySelector('input[name="email"]').value;
        const password = document.querySelector('input[name="password"]').value;
        const confirmPassword = document.querySelector('input[name="confirm-password"]').value;
        console.log(password, confirmPassword);

        // First check if the password and confirmed passwords are equal
        if (password === confirmPassword) {
            document.getElementById("password-mismatch").style.display = 'none';

            // Create JSON object
            var formData = {'email': email, 'password': password};
            
            // Send data to the server via jQuery.ajax()
            jQuery.ajax({
                url: "/processregister",
                data: formData,
                type: "POST",
                success: function(returned_data) {
                    returned_data = JSON.parse(returned_data);
                    if (returned_data.success === 1) {
                        // If registration was successful, show that register was successful
                        document.getElementById("register-error").style.display = 'none';
                        document.getElementById("register-success").style.display = 'block';
                    } else {
                        document.getElementById("register-error").style.display = 'block';
                        document.getElementById("register-success").style.display = 'none';
                    }
                }
            })

        } else {
            console.log("PASSWORDS DO NOT MATCH");
            // If they are not equal, show a message
            document.getElementById("password-mismatch").style.display = 'block';
            document.getElementById("register-success").style.display = 'none';
            document.getElementById("register-error").style.display = 'none';
        }
    }
)

// Get the back button
const backButton = document.getElementById("back-login-btn");

// If user clicks to go back, send them back to login screen
backButton.addEventListener(
    'click',
    function() {
        window.location.href = "/login";
    }
)
