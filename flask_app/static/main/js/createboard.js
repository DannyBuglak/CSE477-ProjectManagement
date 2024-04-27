/**
 * Javascript for handling the creation of a new board
 */

// Get the submit button for creating a new board
const submitCreateBoardBtn = document.getElementById("create-board-submit-btn");

submitCreateBoardBtn.addEventListener(
    'click',
    function() {
        // Get the project name and the comma-separated list of emails
        const projectName = document.getElementById('project-name').value;
        const memberEmails = document.getElementById('member-emails').value.split(',').map(email => email.trim()).filter(email => email.length > 0);

        // Check if there is a project name and at least one email entered
        if (!projectName) {
            document.getElementById("create-name-error").style.display = 'block';
        } else if (projectName) {
            document.getElementById("create-name-error").style.display = 'none';
        }
        if (memberEmails.length === 0) {
            document.getElementById("create-emails-error").style.display = 'block';
        } else if (memberEmails.length > 0) {
            document.getElementById("create-emails-error").style.display = 'none';
        }

        // If all the checks pass, create the board
        if (projectName && memberEmails.length > 0) {
            console.log("Project Name:", projectName);
            
            // Create the JSON object to send to backend
            var formData = {'project_name': projectName, 'members': memberEmails};
            console.log("FORMDATA,", JSON.stringify(formData));

            // Create the members list properly to send it to the backend
            memberEmails.forEach((email, index) => {
                formData[`members[${index}]`] = email;
            });

            console.log("Member Emails:", memberEmails);

            jQuery.ajax({
                url: "/processboardcreation",
                data: formData,
                traditional: true,
                type: "POST",
                success: function(returned_data) {
                    console.log("Server Response:", returned_data);

                    if (returned_data['success']) {
                        window.location.href = '/home';
                    } else if (returned_data['msg'] === 'added member not found in database') {
                        // If the user attempted to add is not registered, show this error message
                        document.getElementById('emails-not-found-error').style.display = 'block';
                    } else {
                        // Other errors, show this message
                        document.getElementById('creating-error').style.display = 'block';
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Error Occurred:", status, error);
                }
            })
        }
    }
)

// Back button feature for select board page
const backButton = document.getElementById("back-button");

backButton.addEventListener(
    'click',
    function() {
        window.location.href = "/createorselect";
    }
)


