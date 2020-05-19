import requests
from datetime import datetime
from flask import Flask, render_template, redirect, request, flash, session, jsonify
from functools import wraps

# This function checks if someone trying to enter a channel has a display name ie signed in
def display_name_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("display") is None:
            return redirect("/")
        return f(*args, **kwargs)

    return decorated_function

# This class stores message sender, the actual message and timestamp
class Message(object):

    def __init__(self, sender, message):
        self.sender = sender
        self.message = message
        self.timestamp = datetime.utcnow()

# This class stores a list of message objects
class MessageList(object):

    def __init__(self, size=100):
        self.size = size
        self.messages = []

    def add_message(self, sender, message):
        if len(self.messages) >= self.size:
            self.messages.pop(0)
        self.messages.append(Message(sender, message))
    
    def delete_message(self, index, message, sender):
        index = int(index)
        if self.messages[index].sender == sender:
            self.messages[index].message = 'Message removed'

# This class stores a list of clients from a particular channels
class ClientList(object):

    def __init__(self):
        self.clients = []
    
    def add_client(self, client):
        self.clients.append(client)
    
    def remove_client(self, client):
        self.clients.remove(client)