/**
 * JavaScript file handling the login page
 */

// Get the login button
const loginButton = document.getElementById("login-btn");

// Count for amount of failed authentications
let authFaultCount = 0;

loginButton.addEventListener(
    'click',
    function() {
        // Extract the data from the inputs
        const email = document.querySelector('input[name="email"]').value;
        const password = document.querySelector('input[name="password"]').value;

        // Create the JSON object
        var formData = {'email': email, 'password': password};
        console.log(formData);

        // Send data to the server via jQuery.ajax()
        jQuery.ajax({
            url: "/processlogin",
            data: formData,
            type: "POST",
            success: function(returned_data) {
                returned_data = JSON.parse(returned_data);
                if (returned_data.success === 1) {
                    window.location.href = "/createorselect";
                } else {
                    authFaultCount++;
                    document.getElementById("login-error").textContent = `Authentication failure ${authFaultCount}`;
                }
            }
        })
    }
)