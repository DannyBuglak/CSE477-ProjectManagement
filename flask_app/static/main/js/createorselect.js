/**
 * JavaScript file handling simple selction for whether user wants to create or select a board 
 */

// Get the buttons
const selectBoardButton = document.getElementById("select-board-btn");
const createBoardButton = document.getElementById("create-board-btn");

selectBoardButton.addEventListener(
    'click',
    function() {
        // If the select board button is clicked, go to the select board page
        window.location.href = '/selectboard';
    }
)

createBoardButton.addEventListener(
    'click',
    function() {
        // If the create board button is clicked, go to the create board page
        window.location.href = '/createboard';
    }
)

// Log out button functionality
const logOutButton = document.getElementById("logout-btn");

logOutButton.addEventListener(
    'click',
    function() {
        // Log out if user wants to
        window.location.href = '/logout';
    }
)