/**
 * JavaScript file for when the user wants to select an existing board connected to their account
 */

// Back button feature for select board page
const backButton = document.getElementById("back-button");

backButton.addEventListener(
    'click',
    function() {
        window.location.href = "/createorselect";
    }
)

// Get all board links
const boardLinks = document.querySelectorAll('.board-item-link');

// Attach event listeners to each board link
boardLinks.forEach(link => {
    link.addEventListener(
        'click',
        function(event) {
            event.preventDefault();

            // Get the board id and name associated with this specific link
            const boardName = this.textContent;

            var formData = {'project_name': boardName};

            // Call the getboardid endpoint to store the clicked on project's id in session
            jQuery.ajax({
                url: "/getboardid",
                data: formData,
                type: "GET",
                success: function(returned_data) {
                
                    var boardId = returned_data['board_id'];

                    window.location.href = '/home';

                }
            })

        }
    )
});
