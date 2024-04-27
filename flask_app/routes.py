# Author: Prof. MM Ghassemi <ghassem3@msu.edu>
from flask import current_app as app, send_from_directory
from flask import render_template, redirect, request, session, url_for, copy_current_request_context, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
from .utils.database.database  import database
from werkzeug.datastructures   import ImmutableMultiDict
from pprint import pprint
import json
import random
import functools
from . import socketio
db = database()


#######################################################################################
# AUTHENTICATION RELATED
#######################################################################################

'''
Enforces login requirement. Redirects if necessary
'''
def login_required(func):
    @functools.wraps(func)
    def secure_function(*args, **kwargs):
        if "email" not in session:
            return redirect(url_for("login", next=request.url))
        return func(*args, **kwargs)
    return secure_function

'''
Retrieves the email from the session if available
'''
def getUser():
    # Decrypt the email if it is in the current session cookie
    if 'email' in session:
        return db.reversibleEncrypt('decrypt', session['email'])
    else:
        return 'Unknown'

'''
Serves the login page
'''
@app.route('/login')
def login():
	return render_template('login.html', user=getUser())

'''
Log the user out, remove the email from the session and redirect to the login screen
'''
@app.route('/logout')
def logout():
	session.pop('email', default=None)
	return redirect('/')

'''
Serves the registration page
'''
@app.route('/register')
def register():
    return render_template('register.html')

'''
Processes the user logging in, authenticates password
'''
@app.route('/processlogin', methods = ["POST","GET"])
def processlogin():
    form_fields = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))
    email = form_fields['email']
    password = form_fields['password']

	# Authentication the login
    auth = db.authenticate(email=email, password=password)

    # If login is successful, store the encrypted email in session cookie, else failure
    if auth.get('success') == 1:
        session['email'] = db.reversibleEncrypt('encrypt', email)
        return json.dumps({'success': 1})
    
    return json.dumps({'failure': 0})

'''
Processes the registration of a user and adds user information to database
'''
@app.route('/processregister', methods = ["POST", "GET"])
def processregister():
    form_fields = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))
    email = form_fields['email']
    password = form_fields['password']

    createUser = db.createUser(email = email, password = password)
    print(createUser)

    if createUser.get('success') == 1:
        return json.dumps({'success': 1})

    return json.dumps({'failure': 0})

    

#######################################################################################
# CHATROOM RELATED
#######################################################################################

'''
Serves the chat page, requires login
'''
@app.route('/chat/<int:board_id>')
@login_required
def chat(board_id):
    return render_template('chat.html', user=getUser(), board=getBoard(), board_id=session['board_id'], current_user_id=getUser())

'''
Handles the user joining the chat room. Join a specific room based off of board ID
'''
@socketio.on('joined', namespace='/chat')
def joined(message):
    boardId = message['board_id']
    join_room(boardId)
    emit('status', {'msg': getUser() + ' has entered the room.', 'user_id': getUser()}, room=boardId)

'''
Handles the user messaging into the chat room
'''
@socketio.on('message', namespace='/chat')
def handle_message(message):
    boardId = message['board_id']
    msg = message['msg']
    emit('message', {'msg': msg, 'user_id': getUser()}, room=boardId)

'''
Handles the user leaving the chat room
'''
@socketio.on('left', namespace='/chat')
def left(message):
    boardId = message['board_id']
    emit('status', {'msg': getUser() + ' has left the room.', 'user_id': getUser()}, room=boardId)



#######################################################################################
# BOARD SELECTION OR CREATION RELATED
#######################################################################################

'''
Get the current board that the user is on, either it was chosen or created
'''
def getBoard():
    if 'board_id' in session:
        return db.getBoardNameFromId(session['board_id'])
    else:
        return "No Board"

'''
Serves the creation of a new board page
'''
@app.route('/createboard')
def create_board():
    return render_template('createboard.html', user=getUser())

'''
Serves the selection of an existing board page
'''
@app.route('/selectboard')
def select_board():
    boards = get_user_boards()
    return render_template('selectboard.html', user=getUser(), boards_list=boards)

'''
Serves the page prompting the user to select or create a board page
'''
@app.route('/createorselect')
def create_or_select_board():
    return render_template('createorselect.html', user=getUser())

'''
Processes the creation of a board, adding to database accordingly
'''
@app.route('/processboardcreation', methods = ["POST"])
def process_board_creation():
    user = getUser()
    project_name = request.form['project_name']
    members = request.form.getlist('members')

    # First check if all the members entered are registered users
    for member in members:
        memberTest = db.getUserId(member)
        if memberTest.get("failure") == 0:
            return {'failure': 0, 'msg': 'added member not found in database'}

    createBoard = db.createBoard(project_name, user)

    # Check if board creation was successful
    if createBoard.get('failure') == 0:
       return {'failure': 0}

    # Add all members requested to the board
    for member in members:
        memberId = db.getUserId(member)['user_id'][0]['user_id']
        db.addUserToBoard(createBoard['board_id'], memberId)

    # Store the board in the session
    session['board_id'] = db.getBoardId(db.getUserId(user)['user_id'][0]['user_id'], project_name)['board_id']

    return {'success': 1}

'''
Gets the board ID stored in the boards table from a board Name
'''
@app.route('/getboardid', methods=['GET'])
def getBoardIdFromName():
    projectName = request.args.get('project_name')

    boardId = db.getBoardIdFromName(projectName)

    session['board_id'] = boardId

    return {'success': 1, 'board_id': boardId}

'''
Gets all the boards that a user is associated with
'''
def get_user_boards():
    user = getUser()
    userIdResult = db.getUserId(user)

    userId = userIdResult['user_id'][0]['user_id']

    # Get all the boards associated with this user
    boards = db.getAllUserBoards(userId)

    if boards == None:
        return None

    return boards



#######################################################################################
# CARD RELATED
#######################################################################################

'''
Gets all the cards stored in the cards table for each list
'''
def getCards():
    # Get the lists of the current board then pull all data from it
    lists = db.getLists(session['board_id'])
    cardsDict = {list_item['list_id']: [] for list_item in lists}

    cards = db.getAllCards(lists)

    for card in cards:
        cardsDict[card['list_id']].append(card)

    return cardsDict

'''
Fetchs all card to show on screen load up
'''
@app.route('/fetchcards', methods=['POST'])
def fetchCards():
    try:
        cardData = getCards()
        return jsonify(cardData)

    except Exception as e:
        return jsonify({'error': str(e)})

'''
Adds a card to the database, ensuring proper connection to the right list
'''
#@app.route('/addcard', methods=['POST'])
@socketio.on('addcard', namespace='/cards')
def addCard(data):
    print(data)
    boardId = session['board_id']
    # listName = request.form['list_id']
    # cardTitle = request.form['card_title']
    # cardDesc = request.form['card_desc']
    listName = data['list_id']
    cardTitle = data['card_title']
    cardDesc = data['card_desc']


    listId = db.getListIdFromName(listName, boardId)

    addCardResult = db.addCard(listId, cardTitle, cardDesc)

    if addCardResult:
        # return {'success': 1}]
        emit('card_added', {'list_id': listId, 'card_title': cardTitle, 'card_desc': cardDesc, 'card_id': addCardResult['card_id']}, broadcast=True)
    
    emit('error', {'message': 'Failed to add card.'})
    # return {'failure': 0}

'''
Handles the deletion of a card
'''
#@app.route('/deletecard', methods=['POST'])
@socketio.on('deletecard', namespace='/cards')
def deletecard(data):
    #cardId = request.form['card_id']
    cardId = data['card_id']

    deleteCardResult = db.deleteCard(cardId)
    
    if deleteCardResult.get('success') == 1:
        # return {'success': 1}
        emit('card_deleted', data, broadcast=True)

    emit('error', {'message': 'Failed to delete card.'})
    #return {'failure': 0}

'''
Handles the editing of a card
'''
#@app.route('/editcard', methods=['POST'])
@socketio.on('editcard', namespace='/cards')
def editcard(data):
    # cardId = request.form['card_id']
    # cardTitle = request.form['card_title']
    # cardDesc = request.form['card_desc']
    cardId = data['card_id']
    cardTitle = data['card_title']
    cardDesc = data['card_desc']

    editCardResult = db.updateCard(cardId, cardTitle, cardDesc)

    if editCardResult.get('success') == 1:
        # return {'success': 1}
        emit('card_edited', data, broadcast=True)

    emit('error', {'message': 'Failed to edit card.'})
    #return {'failure': 0}

'''
Handles updating the database when a card is moved
'''
#@app.route('/updatecardlocation', methods=['POST'])
@socketio.on('updatecardlocation', namespace='/cards')
def updateCardLocation(data):
    # Handle when a card is dragged to another list
    # cardId = request.form['card_id']
    # newListId = request.form['new_list_id']
    cardId = data['card_id']
    newListId = data['new_list_id']

    updateCardLocResult = db.updateCardList(cardId, newListId)

    if updateCardLocResult.get('success') == 1:
        # return {'success': 1}
        emit('card_moved', data, broadcast=True)

    emit('error', {'message': 'Failed to move card.'})
    #return {'failure': 0}



#######################################################################################
# OTHER
#######################################################################################

'''
Root route, the login page
'''
@app.route('/')
def root():
	return redirect('/login')

'''
Serves the home page where the board is
'''
@app.route('/home')
def home():
    lists = db.getLists(session['board_id'])
    return render_template('home.html', user=getUser(), board=getBoard(), lists=lists, cards=getCards(), board_id=session['board_id'])

'''
Serves static files from the 'static' directory
'''
@app.route("/static/<path:path>")
def static_dir(path):
    return send_from_directory("static", path)

'''
Modifies response to control caching behaviors
'''
@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r


