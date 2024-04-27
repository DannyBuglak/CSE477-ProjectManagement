/**
 * JavaScript file for main page of the website.
 * Uses socket.io to ensure live updates of cards.
 */

// Get the add card button to add more cards to the associated list
const addCardButtons = document.querySelectorAll('.add-card-btn');

var socket;

/**
 * Emit events for the card operations
 */
$(document).ready(function() {
    socket = io.connect('https://' + document.domain + ':' + location.port + '/cards');



    
    /**
     * #############################################################
     * # Fetch cards on initial load up of page
     * #############################################################
     */

    // Fetch cards when the page is loaded to automatically get them and update UI with them
    fetchCards();
    function fetchCards() {
        jQuery.ajax({
            url: "/fetchcards",
            type: "POST",
            success: function (returned_data) {
                console.log("RETURNED SERVER RESPONSE FETCH CARDS", returned_data);
                Object.keys(returned_data).forEach(list_id => {
                    // Each value is a card, so iterate over it properly
                    returned_data[list_id].forEach(card => {
                        addCardToUI({
                            ...card, 
                            list_id: list_id 
                        });
                    });
                });
            }
        })
    }

    // Function to add card to UI, called when a card is added and also when page is loaded.
    function addCardToUI(data) {
        // Get the returned data to add the card to the div
        const { list_id, card_title, card_desc, card_id } = data;

        console.log(list_id, card_title, card_desc, card_id);

        // Create the card div
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', 'draggable-item');
        cardDiv.setAttribute('data-card-id', card_id);
        cardDiv.setAttribute('draggable','true');

        // Add the card title
        const cardTitleElement = document.createElement('h3');
        cardTitleElement.classList.add('card-title');
        cardTitleElement.textContent = card_title;
        cardDiv.appendChild(cardTitleElement)

        // Add the card description
        const cardDescElement = document.createElement('p');
        cardDescElement.classList.add('card-desc');
        cardDescElement.textContent = card_desc;
        cardDiv.appendChild(cardDescElement);

        // Find the list using the listId and append the card to it
        const listContainer = document.querySelector(`[data-list-id="${list_id}"] .cards`);
        listContainer.appendChild(cardDiv);
    }




    /**
     * #############################################################
     * # Create a card JS
     * #############################################################
     */

    // Event listener for each "Add a Card" button on the list so the button knows what list it is a part of
    addCardButtons.forEach(button => {
        button.addEventListener(
            'click',
            function() {
                const currModal = document.getElementById('add-card-modal');
                currModal.setAttribute('data-list-id', this.getAttribute('data-list-id'));
                currModal.style.display = 'flex';

                // Add a listener to the submit button when the add card is clicked
                const submitBtn = currModal.querySelector('.submit-new-card-btn');
                submitBtn.addEventListener('click', handleCardCreation);
            }
        )
    })

    // Function handle the card creating, acts as a function for an event listener
    function handleCardCreation(event) {
        event.preventDefault();
        // Get what list name this add a card button is a part of
        var listId = document.getElementById('add-card-modal').getAttribute('data-list-id');

        const cardName = document.querySelector('#card-name').value;
        const cardDesc = document.querySelector('#card-desc').value;

        if (cardName && cardDesc) {
            var formData = {
                'list_id': listId,
                'card_title': cardName,
                'card_desc': cardDesc
            };

            socket.emit('addcard', formData);
        }

        // Hide the modal and clear the input fields after submission
        document.getElementById('add-card-modal').style.display = 'none';
        document.querySelector('#card-name').value = '';
        document.querySelector('#card-desc').value = '';

        // Remove the event listener, this will prevent multiple submissions
        const submitBtn = document.getElementById('add-card-modal').querySelector('.submit-new-card-btn');
        submitBtn.removeEventListener('click', handleCardCreation);
    }




    /**
     * #############################################################
     * # Edit a card JS
     * #############################################################
     */

    // Get the list containers from the document
    const listContainers = document.querySelectorAll('.list-container');

    // Add event listeners to all the containers and only do something if a card was clicked on
    listContainers.forEach(listContainer => {
        listContainer.addEventListener(
            'click',
            function(event) {
                let card = event.target.closest('.card');
                if (card) {
                    const cardId = card.getAttribute('data-card-id');
                    const cardTitle = card.querySelector('.card-title').textContent.trim();
                    const cardDesc = card.querySelector('.card-desc').textContent.trim();

                    // Open and populate the edit card modal
                    const editModal = document.getElementById('edit-card-modal');
                    document.getElementById('edit-card-id').value = cardId;
                    document.getElementById('edit-card-name').value = cardTitle;
                    document.getElementById('edit-card-desc').value = cardDesc;
                    editModal.style.display = 'flex';

                    // Set up the modal listeners for saving edit and delete button
                    setupModalListeners(cardId);
                }
            }
        );
    });

    // Function to handle setting up modal listeners
    function setupModalListeners(cardId) {
        const editModal = document.getElementById('edit-card-modal');
        const saveBtn = editModal.querySelector('.save-edit-btn');
        const deleteBtn = editModal.querySelector('.delete-card-btn');

        // Function to handle saving the edit and updating the cards
        function handleSaveEdit() {
            const updatedCardTitle = document.getElementById('edit-card-name').value.trim();
            const updatedCardDesc = document.getElementById('edit-card-desc').value.trim();

            editedCard = {'card_id': cardId, 'card_title': updatedCardTitle, 'card_desc': updatedCardDesc};

            socket.emit('editcard', editedCard);

            editModal.style.display = 'none';

            // Remove the event listeners after use
            removeModalListeners();
        }

        // Function to handle the key press for saving
        function handleSaveKeyPress(event) {
            if (event.key === "Enter") {
                handleSaveEdit();
                event.preventDefault();
            }
        }

        // Function to handle deleting the card
        function handleDeleteCard() {
            if (confirm("Are you sure you want to delete this card?")) {
                socket.emit('deletecard', {'card_id': cardId});
                editModal.style.display = 'none';
                removeModalListeners();
            }
            
        }

        // Add the event listeners to the buttons and modal
        editModal.addEventListener('keypress', handleSaveKeyPress);
        saveBtn.addEventListener('click', handleSaveEdit);
        deleteBtn.addEventListener('click', handleDeleteCard);

        // Remove the event listeners after use to not have duplicate event listeners
        function removeModalListeners() {
            editModal.removeEventListener('keypress', handleSaveKeyPress);
            saveBtn.removeEventListener('click', handleSaveEdit);
            deleteBtn.removeEventListener('click', handleDeleteCard);
        }
    }
    



    /**
     * #############################################################
     * # Drag & Drop a Card JS
     * #############################################################
     */

    // Add event listeners to all the containers and only do something if a card was clicked on and dragged
    listContainers.forEach(listContainer => {
        listContainer.addEventListener(
            'dragstart',
            function(event) {
                let card = event.target.closest('.card');
                if (card) {
                    event.dataTransfer.setData('text/plain', event.target.getAttribute('data-card-id'));    
                    // Add a class to change CSS for it being dragged     
                    card.classList.add('being-dragged');
                }

            }
        );
    });

    // Add event listeners to all the containers and only do something once a card is stopped ragging
    listContainers.forEach(listContainer => {
        listContainer.addEventListener(
            'dragend',
            function(event) {
                let card = event.target.closest('.card');
                if (card) {
                    // Remove the extra class once the dragging is done
                    card.classList.remove('being-dragged');
                    document.querySelectorAll('.drop-zone').forEach(zone => {
                        zone.classList.remove('over');
                    })
                }
            }
        );
    });

    // Get the dropzone and add all necessary event listeners
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener(
            'dragover',
            function(event) {
                event.preventDefault();
                // Add class for CSS to change the background of the class list when dragged over
                zone.classList.add('over');
            }
        )
        
        zone.addEventListener(
            'drop',
            function(event) {
                event.preventDefault();
                const cardId = event.dataTransfer.getData('text');
                const card = document.querySelector(`.draggable-item[data-card-id="${cardId}"]`);
                const cardsContainer = zone.querySelector('.cards');

                cardsContainer.appendChild(card);

                updateCardLocation(cardId, zone.getAttribute('data-list-id'));

                // Remove the CSS when an item is dropped in here
                zone.classList.remove('over');
            }
        )
        
        zone.addEventListener(
            'dragleave',
            function(event) {
                // Remove the CSS when an item is not dragged over
                zone.classList.remove('over');
            }
        )
    })

    // Function to handling updating the database when a card is moved
    function updateCardLocation(card_id, new_list_id) {
        var formData = {'card_id': card_id, 'new_list_id': new_list_id};
        socket.emit('updatecardlocation', formData);
    }




    /**
     * #############################################################
     * # Socket Listeners for response to update UI accordingly
     * #############################################################
     */

    // When a card is added, update the UI for all
    socket.on('card_added', function(data) {
        addCardToUI(data);
    });

    // When a card is deleted, update the UI for all
    socket.on('card_deleted', function(data) {
        const cardElement = document.querySelector(`[data-card-id="${data.card_id}"]`);
        if (cardElement) {
            cardElement.remove(); 
        }
    });

    // When a card is edited, update the UI for all
    socket.on('card_edited', function(data) {
        const cardElement = document.querySelector(`[data-card-id="${data.card_id}"]`);
        if (cardElement) {
            cardElement.querySelector('.card-title').textContent = data.card_title;
            cardElement.querySelector('.card-desc').textContent = data.card_desc;
        }
    });

    // When a card is moved to a different list, update the UI for all
    socket.on('card_moved', function(data) {
        const { card_id, new_list_id } = data;

        const card = document.querySelector(`.draggable-item[data-card-id="${card_id}"]`);
        const newContainer = document.querySelector(`.drop-zone[data-list-id="${new_list_id}"] .cards`);

        if (card && newContainer) {
            newContainer.appendChild(card);
        }
    });


})


/**
 * #############################################################
 * # Event listeners to close modals
 * #############################################################
 */

// Event listener to close the add a card modal
const closeButton = document.getElementById("close-btn");
closeButton.addEventListener(
    'click',
    function(){
        document.getElementById('add-card-modal').style.display = 'none';
    }
)

// Close button for the edit card modal
const closeModal = document.getElementById('edit-card-modal').querySelector('.close-btn');
closeModal.addEventListener('click', function() {
    document.getElementById('edit-card-modal').style.display = 'none';
});














// document.querySelectorAll('.draggable-item').forEach(item => {
//     item.addEventListener(
//         'dragstart',
//         function(event) {
//             // Set the id of the drag source
//             event.dataTransfer.setData('text/plain', event.target.getAttribute('data-card-id'));    
//             // Add a class to change CSS for it being dragged     
//             item.classList.add('being-dragged');
//         }
//     )

//     item.addEventListener(
//         'dragend',
//         function(event) {
//             // Remove the extra class once the dragging is done
//             item.classList.remove('being-dragged');

//             document.querySelectorAll('.drop-zone').forEach(zone => {
//                 zone.classList.remove('over');
//             })
//         }
//     )
// })


// // Get the dropzone and add all necessary event listeners
// document.querySelectorAll('.drop-zone').forEach(zone => {
//     zone.addEventListener(
//         'dragover',
//         function(event) {
//             event.preventDefault();
//             // Add class for CSS to change the background of the class list when dragged over
//             zone.classList.add('over');
//         }
//     )
    
//     zone.addEventListener(
//         'drop',
//         function(event) {
//             event.preventDefault();
//             const cardId = event.dataTransfer.getData('text');
//             const card = document.querySelector(`.draggable-item[data-card-id="${cardId}"]`);
//             const cardsContainer = zone.querySelector('.cards');

//             cardsContainer.appendChild(card);

//             updateCardLocation(cardId, zone.getAttribute('data-list-id'));

//             // Remove the CSS when an item is dropped in here
//             zone.classList.remove('over');
//         }
//     )
    
//     zone.addEventListener(
//         'dragleave',
//         function(event) {
//             // Remove the CSS when an item is not dragged over
//             zone.classList.remove('over');
//         }
//     )
// })

// // Function to handling updating the database when a card is moved
// function updateCardLocation(card_id, new_list_id) {
    
//     var formData = {'card_id': card_id, 'new_list_id': new_list_id};

//     socket.emit('updatecardlocation', formData);

//     // jQuery.ajax({
//     //     url: "/updatecardlocation",
//     //     method: "POST",
//     //     data: formData,
//     //     success: function(returned_data) {
//     //         console.log("Card moved successfully");
//     //     }
//     // })
// }

// // Get all the cards on the HTML
// const cards = document.querySelectorAll('.card');

// // Add listeners to every card
// cards.forEach(card => {
//     card.addEventListener(
//         'click',
//         function() {
//             //console.log("CARD CLICKED");
//             // Get card details
//             const cardId = this.getAttribute('data-card-id');
//             const cardTitle = this.querySelector('.card-title').textContent.trim();
//             const cardDesc = this.querySelector('.card-desc').textContent.trim();

//             // Populate modal inputs with proper values
//             document.getElementById('edit-card-id').value = cardId;
//             document.getElementById('edit-card-name').value = cardTitle;
//             document.getElementById('edit-card-desc').value = cardDesc;

//             // Get the current edit card modal
//             const currEditCardModal = document.getElementById('edit-card-modal');

//             // Add event listener for the delete button for this card
//             currEditCardModal.querySelector(".delete-card-btn").addEventListener(
//                 'click',
//                 function() {
//                     // Ask user to confirm deletion, then delete
//                     if (confirm("Are you sure you want to delete this card?")) {
                        
//                         var formData = {'card_id': cardId};

//                         jQuery.ajax({
//                             url: "/deletecard",
//                             data: formData,
//                             type: "POST",
//                             success: function(returned_data) {
//                                 if (returned_data.success === 1) {
//                                     window.location.reload();
//                                 }
//                             }
//                         })
//                     }
//                 }
//             ) 

//             // Add event listener for the save button for this card
//             currEditCardModal.querySelector(".save-edit-btn").addEventListener(
//                 'click',
//                 function() {
//                     // Get the updated values of the inputs
//                     const updatedCardTitle = document.getElementById('edit-card-name').value.trim();
//                     const updatedCardDesc = document.getElementById('edit-card-desc').value.trim();

//                     var formData = {
//                         'card_id': cardId, 
//                         'card_title': updatedCardTitle, 
//                         'card_desc': updatedCardDesc
//                     };

//                     // Call the endpoint to update data
//                     jQuery.ajax({
//                         url: "/editcard",
//                         data: formData,
//                         type: "POST",
//                         success: function(returned_data) {
//                             if (returned_data.success === 1) {
//                                 window.location.reload();
//                             }
//                         }
//                     })
//                 }
            
//             )

//             currEditCardModal.addEventListener(
//                 'keypress',
//                 function(event) {
//                     if (event.key === "Enter") {
    
//                         // Get the updated values of the inputs
//                         const updatedCardTitle = document.getElementById('edit-card-name').value.trim();
//                         const updatedCardDesc = document.getElementById('edit-card-desc').value.trim();

//                         var formData = {
//                             'card_id': cardId, 
//                             'card_title': updatedCardTitle, 
//                             'card_desc': updatedCardDesc
//                         };

//                         console.log(formData);

//                         // Call the endpoint to update data
//                         jQuery.ajax({
//                             url: "/editcard",
//                             data: formData,
//                             type: "POST",
//                             success: function(returned_data) {
//                                 if (returned_data.success === 1) {
//                                     window.location.reload();
//                                 }
//                             }
//                         })
//                     }
//                 }
//             )

//             currEditCardModal.style.display = 'flex';
//         }
//     )
// })
