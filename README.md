# Web50 2020 Project 2 - Flack

I have built an online messaging service using Flask and Socket.IO. Users will be able to sign into the site with a display name, create channels (i.e. chatrooms) to communicate in, as well as see and join existing channels. Once a channel is selected, users will be able to send and receive messages with one another in real time. Users can also see when others have joined a channel or left the channel and also when a user is typing. Users can delete their own messages and upload image files as their message too.

## application.py

This contains app config, all routes including socketio routes. These routes inlude rendering index and channel pages, creating display name, creating channel name, sending a message (only text, text and image and only image) and deleting a message.

## helpers.py

This contains a function that checks if someone is signed in, if not theay cannot enter channels. This file also contains some class objects I created to help store message information and client information for each channel.

## requirements.txt

This file contains all the packages needed to run this app, which are: Flask, Flask-SocketIO and python-dotenv.

## templates folder

This folder contains 3 html documents: layout.html, index.html, channel.html.
When a user first goes to the app, they are taken to index.html and then once they have a display name and they pick a channel, they go to channel.html.

## static folder

This folder contains all files to do with style such as styles.scss and styles.css. Also the javascript file with all my javascript for all html pages.
