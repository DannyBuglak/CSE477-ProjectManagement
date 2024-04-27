import mysql.connector
import glob
import json
import csv
from io import StringIO
import itertools
import hashlib
import os
import cryptography
from cryptography.fernet import Fernet
from math import pow

class database:

    def __init__(self, purge = False):

        # Grab information from the configuration file
        self.database       = 'db'
        self.host           = '127.0.0.1'
        self.user           = 'master'
        self.port           = 3306
        self.password       = 'master'
        self.tables         = ['users', 'boards', 'users_to_boards', 'lists', 'cards']

        self.encryption     =  {   'oneway': {'salt' : b'averysaltysailortookalongwalkoffashortbridge',
                                                 'n' : int(pow(2,5)),
                                                 'r' : 9,
                                                 'p' : 1
                                             },
                                'reversible': { 'key' : '7pK_fnSKIjZKuv_Gwc--sZEMKn2zc8VvD6zS96XcNHE='}
                                }
        
    def query(self, query = "SELECT * FROM users", parameters = None):

        cnx = mysql.connector.connect(host     = self.host,
                                      user     = self.user,
                                      password = self.password,
                                      port     = self.port,
                                      database = self.database,
                                      charset  = 'latin1'
                                     )


        if parameters is not None:
            cur = cnx.cursor(dictionary=True)
            cur.execute(query, parameters)
        else:
            cur = cnx.cursor(dictionary=True)
            cur.execute(query)

        # Fetch one result
        row = cur.fetchall()
        cnx.commit()

        if "INSERT" in query:
            cur.execute("SELECT LAST_INSERT_ID()")
            row = cur.fetchall()
            cnx.commit()
        cur.close()
        cnx.close()
        return row

    def createTables(self, purge=False, data_path = 'flask_app/database/'):
        # Professor Ghassemi's code

        # if purge:
        #     for table in self.tables[::-1]:
        #         self.query(f"""DROP TABLE IF EXISTS {table}""")

        # Execute all SQL queries in the /database/create_tables directory.
        for table in self.tables:
            
            #Create each table using the .sql file in /database/create_tables directory.
            with open(data_path + f"create_tables/{table}.sql") as read_file:
                create_statement = read_file.read()
            self.query(create_statement)

            # Import the initial data
            try:
                params = []
                with open(data_path + f"initial_data/{table}.csv") as read_file:
                    scsv = read_file.read()            
                for row in csv.reader(StringIO(scsv), delimiter=','):
                    params.append(row)
            
                # Insert the data
                cols = params[0]; params = params[1:] 
                self.insertRows(table = table,  columns = cols, parameters = params)
            except:
                print('no initial data')


#######################################################################################
# AUTHENTICATION RELATED
#######################################################################################
    def createUser(self, email='me@email.com', password='password', role='user'):
        # Check if the user's email already exists
        sql = "SELECT email FROM users WHERE email = %s"
        userExists = self.query(query=sql, parameters=[email])
        
        # If user already exists, return failure
        if userExists:
            return {'failure': 1}
        
        encryptedPassword = self.reversibleEncrypt('encrypt', password)

        sql = "INSERT INTO users (email, password, role) VALUES (%s, %s, %s)"
        self.query(query=sql, parameters=[email, encryptedPassword, role])

        return {'success': 1}

    def authenticate(self, email='me@email.com', password='password'):
        # Get the saved password for this email
        sql = "SELECT password FROM users WHERE email = %s"
        currPass = self.query(query=sql, parameters=[email])

        # Check if a saved password and email exists exists
        if currPass:
            savedPassword = currPass[0]['password']
        
            # Encrypt the password submitted to test against saved password
            encryptedPassword = self.reversibleEncrypt('decrypt', savedPassword)

            # Check if the saved and entered passwords match
            if password == encryptedPassword:
                return {'success': 1}
            else:
                return {'failure': 0}
        else:
            return {'failure': 0}

    def onewayEncrypt(self, string):
        encrypted_string = hashlib.scrypt(string.encode('utf-8'),
                                          salt = self.encryption['oneway']['salt'],
                                          n    = self.encryption['oneway']['n'],
                                          r    = self.encryption['oneway']['r'],
                                          p    = self.encryption['oneway']['p']
                                          ).hex()
        return encrypted_string


    def reversibleEncrypt(self, type, message):
        fernet = Fernet(self.encryption['reversible']['key'])
        
        if type == 'encrypt':
            message = fernet.encrypt(message.encode())
        elif type == 'decrypt':
            message = fernet.decrypt(message).decode()

        return message


#######################################################################################
# BOARDS RELATED
#######################################################################################

    '''
    Get a user ID from the database
    '''
    def getUserId(self, username):
        # Get the user id of the user name
        sql = """
            SELECT user_id FROM users WHERE email = %s
            """
        
        user_id = self.query(sql, [username])

        print("USERID", user_id)

        if not user_id:
            print("TEST")
            return {'failure': 0, 'error': 'User not found in database'}
        
        return {'success': 1, 'user_id': user_id}

    '''
    Create a board and insert it into the database
    '''
    def createBoard(self, project_name, creator_name):

        # First check if the board name already exists
        sql = """
            SELECT board_id FROM boards WHERE project_name = %s
            """
        projectNameCheck = self.query(sql, [project_name])
        print(projectNameCheck)
        if len(projectNameCheck) > 0:
            return {'failure': 0, 'error': 'Project name already exists'}
    
        # Then get the creating user id from the database and see if user exists
        sql = """
            SELECT user_id FROM users WHERE email = %s
            """
        user_id = self.query(sql, [creator_name])
        if not user_id:
            return {'failure': 0, 'error': 'User not found in database'}
        
        creatorId = user_id[0]['user_id']

        # Then insert the board into the boards database
        sql = """
            INSERT INTO boards (project_name, created_by) VALUES (%s, %s)
            """
        
        self.query(sql, [project_name, creatorId])
        
        print(self.query("SELECT * FROM boards"))

        # Last, return the board id for adding more users to it
        boardIdResult = self.query("""
                    SELECT board_id FROM boards WHERE project_name = %s;
                    """, [project_name])
        
        print(boardIdResult)

        if boardIdResult:
            boardId = boardIdResult[0]['board_id']
            print("BOARDID>A<>A<E", boardId)
            self.addUserToBoard(boardId, creatorId)

            # Initialize the default list upon creation of the board
            defaultLists = ["To Do", "Doing", "Completed"]
            for listName in defaultLists:
                self.createList(boardId, listName)

            return {'success': 1, 'board_id': boardId}
        
        return {'failure': 0, 'error': 'Failed to create board'}

    '''
    Add a user to a board.
    Used for creating the board when user enters emails
    '''
    def addUserToBoard(self, board_id, user_id):
        try:
            sql = """
                INSERT INTO users_to_boards (user_id, board_id) VALUES (%s, %s)
                """
            
            self.query(sql, [user_id, board_id])

            return {'success': 1}
        except Exception as e:
            return {'failure': 0, 'error': str(e)}
        
    '''
    Add the 3 necessary lists to the board.
    To Do, Doing, Completed
    '''
    def createList(self, board_id, list_name):
        try:
            sql = """
                INSERT INTO lists (board_id, list_name) VALUES (%s, %s)
                """
            self.query(sql, [board_id, list_name])
            
        except Exception as e:
            print("Error creating list", list_name, "Error:", str(e))

    '''
    Get all lists associated with a board id
    '''
    def getLists(self, board_id):
        try:
            sql = """
                SELECT * FROM lists WHERE board_id = %s
                """
            
            getListsResult = self.query(sql, [board_id])

            return getListsResult
        except Exception as e:
            print("Error getting lists:", str(e))

    '''
    Get all boards associated with specific user ID
    '''
    def getAllUserBoards(self, user_id):
        sql = """
            SELECT b.board_id, b.project_name, b.created_by
            FROM boards b
            JOIN users_to_boards utb ON b.board_id = utb.board_id
            WHERE utb.user_id = %s    
            """
        
        boards = self.query(sql, [user_id])

        if boards:
            return {'success': 1, 'boards': boards}
        return None
    
    '''
    Get the board ID. Get it based off user logged in ID and board name
    '''
    def getBoardId(self, user_id, board_name):
        sql = """
            SELECT b.board_id
            FROM boards b
            JOIN users_to_boards utb ON b.board_id = utb.board_id
            WHERE utb.user_id = %s AND b.project_name = %s
            """
        
        try:
            boardResult = self.query(sql, [user_id, board_name])
            print("BOARDRESULT", boardResult[0]['board_id'])

            if boardResult:
                print("IN GET BOARD ID", )
                return {'success': 1, 'board_id': boardResult[0]['board_id']}
            else:
                print("No boards found for given user ID and board name")
                return {'failure': 0, 'error': 'No boards found'}
        except Exception as e:
            print("Database operation failed:", str(e))
            return {'failure': 0, 'error': str(e)}
        
    '''
    Get the board name from the board id
    '''
    def getBoardNameFromId(self, board_id):
        sql = """
            SELECT project_name FROM boards WHERE board_id = %s
            """
        
        boardNameResult = self.query(sql, [board_id])

        return boardNameResult[0]['project_name']
    
    '''
    Get the board id from the board name
    '''
    def getBoardIdFromName(self, project_name):
        sql = """
            SELECT board_id FROM boards WHERE project_name = %s
            """
        
        boardIdResult = self.query(sql, [project_name])

        return boardIdResult[0]['board_id']
    
    '''
    Add a card to the database
    '''
    def addCard(self, list_id, card_title, card_desc):
        try:
            sql = """
                INSERT INTO cards (list_id, card_title, card_desc) VALUES (%s, %s, %s)
                """
            
            print([list_id, card_title, card_desc])
            
            self.query(sql, [list_id, card_title, card_desc])
            
            # Get the card_id of the card that was just added
            sql = """
                SELECT card_id FROM cards WHERE list_id = %s AND card_title = %s AND card_desc = %s
                """
            
            cardIdResult = self.query(sql, [list_id, card_title, card_desc])

            return {'success': 1, 'card_id': cardIdResult[0]['card_id']}

        except Exception as e:
            print("Adding card to database cards failed:", str(e))
            return {'failure': 0, 'error': str(e)}
        
    '''
    Retrieve all the cards from the database for the specific board
    '''
    def getAllCards(self, list_ids):
        try:
            allCards = []

            for l in list_ids:
                sql = """
                    SELECT * FROM cards WHERE list_id = %s
                    """
            
                cardsResult = self.query(sql, [l['list_id']])
                print(cardsResult)
                allCards.extend(cardsResult)

            return allCards
                
        except Exception as e:
            print("Failure getting all cards:", str(e))
            return {'failure': 0, 'error': str(e)}
        
    '''
    Get the list id from the list name
    '''
    def getListIdFromName(self, list_name, board_id):
        try:
            sql = """
                SELECT list_id FROM lists WHERE list_name = %s AND board_id = %s
                """
            
            listIdResult = self.query(sql, [list_name, board_id])

            return listIdResult[0]['list_id']

        except Exception as e:
            print("Failure getting list ID from name:", str(e))
            return {'failure': 0, 'error': str(e)}

    '''
    Delete the card from the cards table
    '''
    def deleteCard(self, card_id):
        try:
            sql = """
                DELETE FROM cards WHERE card_id = %s
                """
            
            self.query(sql, [card_id])
            
            return {'success': 1}

        except Exception as e:
            print("Failure deleting card:", str(e))
            return {'failure': 0, 'error': str(e)}

    '''
    Update the card in the cards table
    '''
    def updateCard(self, card_id, card_title, card_desc):
        try:
            sql = """
                UPDATE cards SET card_title = %s, card_desc = %s WHERE card_id = %s
                """
            
            print("PARAMS", [card_title, card_desc, card_id])
            
            self.query(sql, [card_title, card_desc, card_id])
            
            return {'success': 1}

        except Exception as e:
            print("Failure updating card:", str(e))
            return {'failure': 0, 'error': str(e)}

    '''
    Handle updating the databse when a card is moved
    '''
    def updateCardList(self, card_id, new_list_id):
        try:
            sql = """
                UPDATE cards SET list_id = %s WHERE card_id = %s
                """
            
            self.query(sql, [new_list_id, card_id])

            print(self.query("SELECT * FROM cards"))

            return {'success': 1}
        except Exception as e:
            print("Failure updating card after moving:", str(e))
            return {'failure': 0, 'error': str(e)}

