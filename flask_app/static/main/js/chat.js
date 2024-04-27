/**
 * JavaScript file for the chat
 */

var socket;

var currentUserId = $('#current-user-id').data('user-id');

$(document).ready(function() {
    socket = io.connect('https://' + document.domain + ':' + location.port + '/chat');
    const boardId = $('#chat').data('board-id');

    socket.on('message', (data) => {
        let chat = document.getElementById("chat");
        let msg = document.createElement("p");
        msg.textContent = data.msg;

        // User's message are on the right and blue while other users are on the left and grey
        if (data.user_id.trim() === currentUserId.trim()) {
            msg.style.cssText = 'width: 100%; color: blue; text-align: right;';
        } else {
            msg.style.cssText = 'width: 100%; color: grey; text-align: left';
        }

        chat.appendChild(msg);
        $('#chat').scrollTop($('#chat')[0].scrollHeight);
    });

    socket.on('connect', function() {
        socket.emit('joined', {board_id: boardId});

        // Event listener for sending a message
        document.getElementById('send-message').addEventListener(
            'click',
            function() { 
                // Get the message input box and its value and emit the data using socket io then clear in the input
                let messageInput = document.getElementById("message-input");
                let message = messageInput.value;
                socket.emit('message', {msg: message, board_id: boardId});
                messageInput.value = "";
        });

        // Event listener for sending a message with the enter key
        document.getElementById('message-input').addEventListener(
            'keypress',
            function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let message = this.value;
                    socket.emit('message', {msg: message, board_id: boardId});
                    this.value = '';
                }
            }
        )

        // Event listener for leaving chat room and sending user to home screen
        document.getElementById('leave-room').addEventListener(
            'click',
            function() {
                socket.emit('left', {board_id: boardId}, () => window.location.href = "/home");
            }
        )

    });
    
    socket.on('status', function(data) {     
        let tag  = document.createElement("p");
        let text = document.createTextNode(data.msg);
        let element = document.getElementById("chat");
        tag.appendChild(text);

        // User's message are on the right and blue while other users are on the left and grey
        if (data.user_id.trim() === currentUserId.trim()) {
            tag.style.cssText = 'width: 100%; color: blue; text-align: right;';
        } else {
            tag.style.cssText = 'width: 100%; color: grey; text-align: left';
        }

        element.appendChild(tag);
        $('#chat').scrollTop($('#chat')[0].scrollHeight);
    });      

});