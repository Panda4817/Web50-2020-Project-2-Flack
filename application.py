import os
import requests
import html
from datetime import datetime
from tempfile import mkdtemp

from flask import Flask, render_template, redirect, request, flash, session, jsonify
from flask_session import Session
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from helpers import display_name_required, MessageList, Message, ClientList

# Set up flask app
app = Flask(__name__)

# Load environment variables
load_dotenv("C:/Users/Kanta/Documents.env")

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# Ensure templates are auto-reloaded
app.config["TEMPLATES_AUTO_RELOAD"] = True


# Configure session to use filesystem
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = True
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Set up socket.io
socketio = SocketIO(app)

# Global variables to store data
names = []
channels = []
messages = {}
clients = {}

@app.route("/")
def index():
    # Render index.html depending on if display name is chosen or not
    if session.get("display") == None:
        return render_template("index.html")
    else:
        global channels
        return render_template("index.html", channels=channels, display_name=session["display"])

@app.route("/name_check", methods=["POST"])
def name_check():
    # Get name from form via AJAX, check is it only has letters or numbers
    name = request.form["name_input"]
    if name != "" and name != None:
        for i in range(len(name)):
            if not name[i].isalnum():
                result="Display name must only contain letters and/or numbers"
                return result
        
        # Check display name is unique
        global names
        for row in names:
            if name == row:
                result = "Display name unavailable"
                return result
        
        # Passes above checks
        result = "Display name available"
        return result
    
    # Else display name not filled in
    else:
        result = "Display name is required"
        return result


@app.route("/index_name", methods=["POST"])
def name():
    name = request.form.get("display")

    # Check display name inputted
    if not name:
        flash("Must provide display name", "error")
        return render_template("index.html")
    
    # Check display name is only letters and numbers
    for i in name:
        if not i.isalnum():
            flash("Display name must only contain letters and/or numbers", "error")
            return render_template("index.html")
    
    # Check display name is unique
    global names
    for row in names:
        if name == row:
            flash("Display name taken", "error")
            return render_template("index.html")
    
    # Above checks passed
    session["display"] = name
    names.append(name)
    return redirect("/")

# Personal touch to allow people to choose a different display name and logout from the app
@app.route("/logout", methods=["GET"])
def logout():
    # Remove from names list
    global names
    for row in names:
        if row == session["display"]:
            names.remove(row)
    
    # Forget display name and channel
    session.clear()

    # Redirect user to index
    return redirect("/")

@app.route("/channel_check", methods=["POST"])
def channel_check():
    # Get channel input from form using AJAX, check is channel name only contains letters and numbers
    channel = request.form["channel_input"]
    if channel != "" and channel != None:
        for i in range(len(channel)):
            if not channel[i].isalnum():
                result ="Channel name must only contain letters and/or numbers"
                return result
        
        # Check channel name is unique
        global channels
        for row in channels:
            if channel == row:
                result = "Channel name unavailable"
                return result
        
        # Passes above checks
        result = "Channel name available"
        return result
    
    # Else channel input is empty
    else:
        result = "Channel name is required"
        return result

# Update channels lists without window refresh
@socketio.on("create channel")
@display_name_required
def channel_create(data):
    channel = data["channel_name"]
    global channels
    # Check channel name inputted
    if not channel:
        flash("Must provide channel name", "error")
        return render_template("index.html", channels=channels, display_name=session["display"])
    
    # Check channel name is only letters and numbers
    for i in channel:
        if not i.isalnum():
            flash("Channel name must only contain letters and/or numbers", "error")
            return render_template("index.html", channels=channels, display_name=session["display"])
    
    # Check channel name is unique
    for row in channels:
        if channel == row:
            flash("Channel name taken", "error")
            return render_template("index.html", channels=channels, display_name=session["display"])
    
    # If above checks are passed, channel entered into global variables
    global messages
    global clients
    channels.append(channel)
    messages[channel] = MessageList()
    clients[channel] = ClientList()
    
    emit("channel created", {"channel_name": channel}, broadcast=True)
    emit("redirect", {"channel_name": channel}, broadcast=False)
    
# Send text-only message without refresh of window
@socketio.on("send msg")
@display_name_required
def send_msg(data):
    # Escape html
    msg = html.escape(data['msg'], quote=False)
    # Check message is not empty
    if not msg:
        flash("Nothing to send", "error")
        return render_template("channel.html", channel_name=data['channel'])
    
    # Get sender name
    sender = data['user']
    
    # Enter into global variable (using class objects)
    messages[data['channel']].add_message(sender, msg)
    msg_id = len(messages[data['channel']].messages) - 1
    tc = messages[data['channel']].messages[-1].timestamp
    tc = tc.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    
    emit("msg sent", {"msg": msg, "sender": sender, "time" : tc, "msg_id": msg_id, "channel": data['channel']}, broadcast=True)

# Personal touch -  let others in the channel know when someone is typing
@socketio.on("typing")
@display_name_required
def send_msg(data):
    typer_name = data['user_name']
    emit("typing", {'name': typer_name, 'channel': data['channel']}, broadcast=True)

# Personal touch -  let others in the channel know when someone has joined
@socketio.on("joined")
@display_name_required
def joined(data):
    channel_join = data['channel'].split('/')
    client_name = data['user']
    global clients
    if client_name not in clients[channel_join[1]].clients:
        clients[channel_join[1]].add_client(client_name)
    emit('joined', {'user': client_name, 'channel': data['channel']}, broadcast=True)

# Personal touch - let others in the channel kno when someone has left
@socketio.on("left")
@display_name_required
def left(data):
    channel_join = data['channel'].split('/')
    client_name = data['user']
    global clients
    if client_name in clients[channel_join[1]].clients:
        clients[channel_join[1]].remove_client(client_name)
    emit('left', {'user': client_name, 'channel': data['channel']}, broadcast=True)

# Personal touch - be able to delete own message
@socketio.on("delete")
@display_name_required
def delete(data):
    global channels
    global messages
    global clients
    
    # Check if the message you want to delete is your own
    if data['sender'] != session['display']:
        emit('delete_declined', broadcast=False)
    # Else it replaces the message with standard 'message removed' and then javascript hides it
    else:
        cdelete = data['channel'].split('/')
        messages[cdelete[1]].delete_message(data['msg_index'], data['msg'], data['sender'])
        emit('delete', {'channel': data['channel'], 'id': data['msg_index']}, broadcast=True)

# Personal touch -  Allow upload of image files one at a time
@socketio.on('img-upload')
@display_name_required
def imageUpload(data):
    # First check if the file type is an image
    data_type = data['file']['type'].split('/')
    if data_type[0] != 'image':
        emit('upload declined', broadcast=False)
    
    # Then add it to global variables, just like text-message
    else:
        messages[data['channel']].add_message(data['user'], data['file'])
        msg_id = len(messages[data['channel']].messages) - 1
        tc = messages[data['channel']].messages[-1].timestamp
        tc = tc.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        emit('send-img',  {"file": data['file'], "sender": data['user'], "time" : tc, "msg_id": msg_id, "channel": data['channel']}, broadcast = True)

# Personal touch  - allow text and image combo
@socketio.on('img&msg send')
@display_name_required
def image_msg(data):
    # First check file is image type
    data_type = data['file']['type'].split('/')
    if data_type[0] != 'image':
        emit('upload declined', broadcast=False)
    # Then store message data in global variables, making sure the text part is html escaped
    else:
        data['file']['msg'] = html.escape(data['file']['msg'], quote=False)
        messages[data['channel']].add_message(data['user'], data['file'])
        msg_id = len(messages[data['channel']].messages) - 1
        tc = messages[data['channel']].messages[-1].timestamp
        tc = tc.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        emit('send-img-msg',  {"file": data['file'], "sender": data['user'], "time" : tc, "msg_id": msg_id, "channel": data['channel']}, broadcast = True)

# Personal touch -  searchbar in the navbar to serarch through existing channels
@app.route("/search_channel", methods=["POST"])
@display_name_required
def search_channel():
    search_input = request.form["search_input"]
    global channels
    channel_correct = False
    if search_input in channels:
        channel_correct = True
    return jsonify(json_list=channels, channel_correct=channel_correct)

# Once picked a channel using the search bar, you can join that channel
@app.route("/join_channel", methods=["POST"])
@display_name_required
def join_channel():
    search_channel = request.form.get('search_channel')
    global channels
    # Check channel name inputted
    if not search_channel:
        flash("Must provide channel name", "error")
        return render_template("index.html", channels=channels, display_name=session["display"])
    
    # Check channel name is only letters and numbers
    for i in search_channel:
        if not i.isalnum():
            flash("Channel name must only contain letters and/or numbers", "error")
            return render_template("index.html", channels=channels, display_name=session["display"])
    
    # Check channel exists
    if search_channel not in channels:
        flash("Channel does not exist", "error")
        return render_template("index.html", channels=channels, display_name=session["display"])
    
    #If above checks are passes
    return redirect("/"+search_channel)

# This route renders channel.html according to channel name
@app.route("/<string:channel_name>")
@display_name_required
def channel(channel_name):
    # Check channel name exists
    global channels
    global messages
    global clients
    # First check channel exists
    if channel_name not in channels:
        flash("Channel does NOT exist", "error")
        return render_template("index.html", display_name=session["display"], channels=channels)
    
    # Then add client display name to list of clients for that channel
    if session['display'] not in clients[channel_name].clients:
        clients[channel_name].add_client(session['display'])
    
    # Create new lists
    ml = []
    c = []
    
    # Add list of clients to c list
    for row in range(len(clients[channel_name].clients)):
        x = clients[channel_name].clients[row]
        c.append(x)
    
    # If no messages yet then render channel.html with no messages
    if len(messages[channel_name].messages) == 0:
        return render_template("channel.html", channel_name=channel_name, clients=c)
    # Else messages are copied into ml list, remembering to unescape message text so it is rendered properly
    else:
        for row in range(len(messages[channel_name].messages)):
            message = messages[channel_name].messages[row].message
            if isinstance(message, dict):
                if 'msg' in message:
                    message['msg'] = html.unescape(message['msg'])
            else:
                message = html.unescape(message)
            sender = messages[channel_name].messages[row].sender
            timestamp = messages[channel_name].messages[row].timestamp
            timestamp = timestamp.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            ml.append({
                "message" : message,
                "sender" : sender,
                "timestamp": timestamp
            })
        
        return render_template("channel.html", channel_name=channel_name, messages=ml, clients=c)
    

    
