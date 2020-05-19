document.addEventListener('DOMContentLoaded', () => {

    // Set local storage for channel
    if (!(localStorage.getItem('channel')))
        localStorage.setItem('channel', 'channel');

    // Check url path, channel, set local storage channel name
    var url_path = location.pathname;
    if (url_path != "/")
        localStorage.setItem('channel', url_path);

    // If local storage channel is not default then redirect to channel
    if ((localStorage.getItem('channel') != 'channel') && (location.pathname == "/"))
        location.replace(localStorage.getItem('channel'));
    
    // Check if on channel body and msg body div is scrolled to latest message
    var msg_body = document.getElementById('msg_body');
    if (msg_body != null) {
        msg_body.scrollTop = msg_body.scrollHeight;
    }

    // Convert all times for messages to local time
    var time = document.getElementsByClassName('time');
    if (time.length != 0) {
        for (var i=0, len=time.length; i<len; i++) {
            const utc = time[i].innerText;
            var local = new Date(utc);
            var now = new Date();
            if (local.toDateString() == now.toDateString())
                var date = 'Today';
            else if (local.getDate() == (now.getDate() - 1))
                var date = 'Yesterday';
            else
                var date = local.toDateString();
            time[i].innerText = date + ' ' + local.toLocaleTimeString();
        };
    };

    //Set local storage for display name
    if (!(localStorage.getItem('display_name')))
        localStorage.setItem('display_name', 'display_name');

    // disable submit button until input filled out
    document.querySelectorAll('button').disabled = true;
    
    // Check if display name exists on display name form
    var display = document.querySelector('#display')
    if (display != null) {
        display.addEventListener('input', () => {
        document.querySelector('#name_check').style.visibility = 'hidden';
        document.querySelector('#display_button').disabled = true;
            if (display.value.length < 1) {
                document.querySelector('#display_button').disabled = true;
                document.querySelector('#name_check').style.visibility = 'visible';
                document.querySelector('#name_check').style.color= 'red';
                document.querySelector('#name_check').innerHTML = 'Display name is required';
            }     
            else {
                $.ajax({
                    type: "POST",
                    url: "/name_check",
                    data: {
                        name_input: $('#display').val()
                    }
                }).done(function(data) {
                    if (data == "Display name available") {
                        document.querySelector('#display_button').disabled = false;
                        document.querySelector('#name_check').style.visibility = 'visible';
                        $("#name_check").html(data).css("color", "green");
                    } else {
                        document.querySelector('#display_button').disabled = true;
                        document.querySelector('#name_check').style.visibility = 'visible';
                        $("#name_check").html(data).css("color", "red"); 
                    }
                });
            }
            
        });
    }
    
     
    // Store display name in local storage once form submitted
    var display_form = document.querySelector('#display_name')
    if (display_form != null) {
        display_form.onsubmit = () => {
            var display_name =  document.getElementById('display').value;
            localStorage.setItem('display_name', display_name);

        };
    } 
    


    // Check if channel name exists before creating channel using form
    var channel = document.querySelector('#channel')
    if (channel != null) {
        channel.addEventListener('input', () => {
        document.querySelector('#channel_check').style.visibility = 'hidden';
        document.querySelector('#channel_button').disabled = true;
            if (channel.value.length < 1) {
                document.querySelector('#channel_button').disabled = true;
                document.querySelector('#channel_check').style.visibility = 'visible';
                document.querySelector('#channel_check').style.color= 'red';
                document.querySelector('#channel_check').innerHTML = 'Channel name is required';
            }     
            else {
                $.ajax({
                    type: "POST",
                    url: "/channel_check",
                    data: {
                        channel_input: $('#channel').val()
                    }
                }).done(function(data) {
                    if (data == "Channel name available") {
                        document.querySelector('#channel_button').disabled = false;
                        document.querySelector('#channel_check').style.visibility = 'visible';
                        $("#channel_check").html(data).css("color", "green");
                    } else {
                        document.querySelector('#channel_button').disabled = true;
                        document.querySelector('#channel_check').style.visibility = 'visible';
                        $("#channel_check").html(data).css("color", "red"); 
                    }
                });
            }
            
        });
    }

    // onclick event on each msg div
    d = '';
    msg_id = '';
    msg_sender = '';
    msg_txt = '';
    $('.msg').click(function() {
        d = $(this);
        msg_id = $(this).attr('id');
        msg_sender = $(this).attr('sender');
        msg_txt = $(this).html();
        delete_button();
    })

    // Linkify each msg div
    $('.msg').linkify();

    // File attach button
    const attachBtn = document.querySelector('#attach_btn');
    if (attachBtn != null){
        const hiddenInput = document.querySelector(".file-upload-input");
        const label = document.querySelector(".file-text");
        const defaultLabelText = "";
        const clearfiles = document.querySelector('#clearfiles');
        clearfiles.title = 'Clear files attached';
          
        // Set default text for label
        label.textContent = defaultLabelText;
    
        attachBtn.addEventListener("click", function() {
            hiddenInput.click();
        });
          
        hiddenInput.addEventListener("change", function() {
            const filename = hiddenInput.files;
            label.textContent = 'Attached: '+filename[0].name || defaultLabelText;
            label.title = label.textContent;
            clearfiles.style.visibility = 'visible';
            document.querySelector('.send_btn').disabled = false;
        });
        
        clearfiles.addEventListener('click', () => {
            hiddenInput.value = '';
            label.textContent = defaultLabelText;
            clearfiles.style.visibility = 'hidden';
            document.querySelector('.send_btn').disabled = true;
        });
    }

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected
    socket.on('connect', () => {
        
        // If create channel form is submitted, update channel list for everyone
        var create_form = document.querySelector('#create_channel')
        if (create_form != null) {
            document.querySelector('#create_channel').onsubmit = () => {
                var channel_name = channel.value;
                localStorage.setItem('channel', channel_name);
                socket.emit('create channel', {'channel_name': channel_name});
                return false;
            };
        }

        // Check url and emit joined existing channel
        if (url_path != "/") {
            socket.emit('joined', {'channel': localStorage.getItem('channel'), 'user': localStorage.getItem('display_name')});    
        }
        
        // If msg box is being used, disable/enable send button, broadcast if typing
        var type_msg_box = document.querySelector('.type_msg')
        if (type_msg_box != null) {
            type_msg_box.addEventListener('keypress', () => {
                socket.emit('typing', {'user_name': localStorage.getItem('display_name'), 'channel': location.pathname});
            });
            type_msg_box.addEventListener('keyup', () => {
                var msg_check = type_msg_box.value;
                if (msg_check.length < 1) {
                    document.querySelector('.send_btn').disabled = true;
                }
                else {
                    document.querySelector('.send_btn').disabled = false;
                }
            }); 
        }

        // When send mesg form is submitted, socket emit occurs and form resets
        var send_msg_form = document.querySelector('#send_msg')
        if (send_msg_form != null) {
            document.querySelector('#send_msg').addEventListener('submit', () => {
                var msg = document.querySelector('.type_msg').value;
                var channel_page = document.querySelector('#channel_name').innerHTML;
                var user = localStorage.getItem('display_name'); 
                var file = document.querySelector('.file-upload-input').files[0];
                if (msg == '') {
                    var fileReader = new FileReader();
                    fileReader.readAsDataURL(file);
                    fileReader.onload = () => {
                        var arrayBuffer = fileReader.result;
                        socket.emit('img-upload', {
                            'file': {
                                'msg&file': false,
                                'name': file.name,
                                'type': file.type, 
                                'size': file.size, 
                                'binary': arrayBuffer
                            }, 
                            'channel': channel_page, 
                            'user': user
                        });
                    };
                    
                }
                else if (msg.length != 0 && document.querySelector('.file-upload-input').files.length != 0) {
                    var fileReader = new FileReader();
                    fileReader.readAsDataURL(file);
                    fileReader.onload = () => {
                        var arrayBuffer = fileReader.result;
                        socket.emit('img&msg send', {
                            'file': {
                                'msg&file': true, 
                                'msg': msg, 
                                'name': file.name, 
                                'type': file.type, 
                                'size': file.size, 
                                'binary': arrayBuffer
                            }, 
                            'channel': channel_page, 
                            'user': user
                        });
                    };
                }
                else {
                    socket.emit('send msg', {'msg': msg, 'channel': channel_page, 'user': user});
                }
                document.querySelector('#send_msg').reset();
                const label = document.querySelector(".file-text");
                const defaultLabelText = "";
                const clearfiles = document.querySelector('#clearfiles');
                label.textContent = defaultLabelText;
                clearfiles.style.visibility = 'hidden';
                document.querySelector('.send_btn').disabled = true;
                return false; 
            });
        }

        // when nav bar clicked, remove from old channel, reset channel name
        var nava = document.getElementsByClassName('left');
        for (var i=0, len=nava.length; i<len; i++) {
            nava[i].onclick = () => {
                let c = localStorage.getItem('channel');
                socket.emit('left', {'channel': c, 'user': localStorage.getItem('display_name')});
                localStorage.setItem('channel', 'channel');
            };
        };
    
        // When sign out clicked
        var logout = document.querySelector('.forget')
        if (logout != null) {
            // When logout cliked, reset everything
            document.querySelector('.forget').onclick = () => {
                let c = localStorage.getItem('channel');
                let d = localStorage.getItem('display_name');
                socket.emit('left', {'channel': c, 'user': d});
                localStorage.setItem('channel', 'channel');
                localStorage.setItem('display_name', 'display_name');
            };
            
            // When click on search bar join button, remove from old channel, reset channel name
            document.querySelector('#search_button').onclick = () => {
                let c = localStorage.getItem('channel');
                socket.emit('left', {'channel': c, 'user': localStorage.getItem('display_name')});
                localStorage.setItem('channel', 'channel')
            };
        }


        // Delete msg button onclik event
        var d_btn = document.querySelector('#delete_button');
        if (d_btn != null) {
            document.querySelector('#delete_button').onclick = () => {
                let c = localStorage.getItem('channel');
                socket.emit('delete', {'channel': c, 'sender': msg_sender, 'msg_index': msg_id, 'msg': msg_txt});
            }
        }
        
        
        
    });

    // When new channel created, DOM updated
    socket.on('channel created', data => {
        var no_channel_div = document.querySelector("#no_channels")
        if (no_channel_div != null) {
            document.querySelector('#no_channels').style.display = 'none';
            document.querySelector('#join_channel').style.visibility = 'visible';
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.innerHTML = data.channel_name;
            a.href = `/${data.channel_name}`;
            li.append(a);
            document.querySelector('#channels').append(li);
        }   
    });

    // The person wwho created the new channel is redirected to channel page
    socket.on('redirect', data => {
        location.replace(`/${data.channel_name}`);
    });

    // When img and message sent
    socket.on('send-img', data => {
        if (location.pathname == '/'+data.channel) {
            if (data.sender != localStorage.getItem('display_name')) {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-start mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_in');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_in mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_in');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_in');
                
                var sent_file = document.createElement('img');
                sent_file.setAttribute('src', data.file.binary);
                sent_file.setAttribute('alt', data.file.name);
                sent_file.setAttribute('class', 'msg picture');
                sent_file.setAttribute('id', 'pic-'+data.msg_id);
                sent_file.setAttribute('sender', data.sender);
                sent_file.onclick = () => {
                    msg_id = (sent_file.getAttribute('id').split('-'))[1];
                    msg_txt = sent_file.getAttribute('src');
                    msg_sender = sent_file.getAttribute('sender');
                    delete_button();
                };
                
                msg_cont_div.append(msg_name);
                msg_cont_div.append(sent_file);
                msg_cont_div.append(msg_time);
                msg_div.append(img_div);
                msg_div.append(msg_cont_div);
                document.querySelector('#msg_body').append(msg_div);
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
            }
            else {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-end mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_out');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_out mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_out');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_out');
                
                var sent_file = document.createElement('img');
                sent_file.setAttribute('src', data.file.binary);
                sent_file.setAttribute('alt', data.file.name);
                sent_file.setAttribute('class', 'msg picture');
                sent_file.setAttribute('id', 'pic-'+data.msg_id);
                sent_file.setAttribute('sender', data.sender);
                sent_file.onclick = () => {
                    msg_id = (sent_file.getAttribute('id').split('-'))[1];
                    msg_txt = sent_file.getAttribute('src');
                    msg_sender = sent_file.getAttribute('sender');
                    delete_button();
                };

                msg_cont_div.append(msg_name);
                msg_cont_div.append(sent_file);
                msg_cont_div.append(msg_time);
                msg_div.append(msg_cont_div);
                msg_div.append(img_div);
                document.querySelector('#msg_body').append(msg_div);
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
            }
        }
    })

    // When img sent, dom updated
    socket.on('send-img-msg', data => {
        if (location.pathname == '/'+data.channel) {
            if (data.sender != localStorage.getItem('display_name')) {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-start mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_in');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_in mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_in');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_in');
                
                const msg_text = document.createElement('div');
                msg_text.setAttribute('class', 'msg');
                msg_text.setAttribute('id', data.msg_id);
                msg_text.setAttribute('sender', data.sender);
                msg_text.innerHTML = data.file.msg;
                msg_text.onclick = () => {
                    msg_id = msg_text.getAttribute('id');
                    msg_txt = msg_text.innerText;
                    msg_sender = msg_text.getAttribute('sender');
                    delete_button();
                };

                var sent_file = document.createElement('img');
                sent_file.setAttribute('src', data.file.binary);
                sent_file.setAttribute('alt', data.file.name);
                sent_file.setAttribute('class', 'msg picture');
                sent_file.setAttribute('id', 'pic-'+data.msg_id);
                sent_file.setAttribute('sender', data.sender);
                sent_file.onclick = () => {
                    msg_id = (sent_file.getAttribute('id').split('-'))[1];
                    msg_txt = sent_file.getAttribute('src');
                    msg_sender = sent_file.getAttribute('sender');
                    delete_button();
                };
                
                msg_cont_div.append(msg_name);
                msg_cont_div.append(msg_text);
                msg_cont_div.append(sent_file);
                msg_cont_div.append(msg_time);
                msg_div.append(img_div);
                msg_div.append(msg_cont_div);
                document.querySelector('#msg_body').append(msg_div);
                $('#'+data.msg_id).linkify();
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
            }
            else {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-end mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_out');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_out mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_out');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_out');
                
                const msg_text = document.createElement('div');
                msg_text.setAttribute('class', 'msg');
                msg_text.setAttribute('id', data.msg_id);
                msg_text.setAttribute('sender', data.sender);
                msg_text.innerHTML = data.file.msg;
                msg_text.onclick = () => {
                    msg_id = msg_text.getAttribute('id');
                    msg_txt = msg_text.innerText;
                    msg_sender = msg_text.getAttribute('sender');
                    delete_button();
                };

                var sent_file = document.createElement('img');
                sent_file.setAttribute('src', data.file.binary);
                sent_file.setAttribute('alt', data.file.name);
                sent_file.setAttribute('class', 'msg picture');
                sent_file.setAttribute('id', 'pic-'+data.msg_id);
                sent_file.setAttribute('sender', data.sender);
                sent_file.onclick = () => {
                    msg_id = (sent_file.getAttribute('id').split('-'))[1];
                    msg_txt = sent_file.getAttribute('src');
                    msg_sender = sent_file.getAttribute('sender');
                    delete_button();
                };

                msg_cont_div.append(msg_name);
                msg_cont_div.append(msg_text);
                msg_cont_div.append(sent_file);
                msg_cont_div.append(msg_time);
                msg_div.append(msg_cont_div);
                msg_div.append(img_div);
                document.querySelector('#msg_body').append(msg_div);
                $('#'+data.msg_id).linkify();
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
            }
        }
    });

    // When file declined
    socket.on('upload declined', () => {
        var feedback = document.querySelector('#feedback');
        feedback.style.visibility = 'visible';
        feedback.innerHTML = 'Only allowed to attach image files such as JPEG, PNG or GIF';
        setTimeout( () => {
            feedback.style.visibility = 'hidden';
        }, 5000);
    })


    // When message sent, dom updated for everyone
    socket.on('msg sent', data => {
        if (location.pathname == '/'+data.channel) {
            if (data.sender != localStorage.getItem('display_name')) {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-start mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_in');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_in mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_in');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_in');
                const msg_text = document.createElement('div');
                msg_text.setAttribute('class', 'msg');
                msg_text.setAttribute('id', data.msg_id);
                msg_text.setAttribute('sender', data.sender);
                msg_text.innerHTML = data.msg;
                msg_text.onclick = () => {
                    msg_id = msg_text.getAttribute('id');
                    msg_txt = msg_text.innerText;
                    msg_sender = msg_text.getAttribute('sender');
                    delete_button();
                };
                msg_cont_div.append(msg_name);
                msg_cont_div.append(msg_text);
                msg_cont_div.append(msg_time);
                msg_div.append(img_div);
                msg_div.append(msg_cont_div);
                document.querySelector('#msg_body').append(msg_div);
                $('#'+data.msg_id).linkify();
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
            }
            else {
                const msg_div = document.createElement('div');
                msg_div.setAttribute('class', 'd-flex justify-content-end mb-4');
                const img_div = document.createElement('div');
                img_div.setAttribute('class', 'img_cont_msg');
                const icon = document.createElement('i');
                icon.setAttribute('class', 'fas fa-user user_img_msg_out');
                icon.setAttribute('id', 'img'+data.msg_id);
                img_div.append(icon);
                const msg_cont_div = document.createElement('div');
                msg_cont_div.setAttribute('class', 'msg_container_out mb-2');
                msg_cont_div.setAttribute('id', 'msg'+data.msg_id);
                const msg_name = document.createElement('div');
                msg_name.innerHTML = data.sender;
                msg_name.setAttribute('class', 'msg_name_out');
                const msg_time = document.createElement('div');
                
                var local = new Date(data.time)
                var now = new Date();
                if (local.toDateString() == now.toDateString())
                    var date = 'Today';
                else if (local.getDate() == (now.getDate() - 1))
                    var date = 'Yesterday';
                else
                    var date = local.toDateString();
                msg_time.innerHTML = date + ' ' + local.toLocaleTimeString();
                
                msg_time.setAttribute('class', 'time msg_time_out');
                const msg_text = document.createElement('div');
                msg_text.setAttribute('class', 'msg');
                msg_text.setAttribute('id', data.msg_id);
                msg_text.setAttribute('sender', data.sender);
                msg_text.innerHTML = data.msg;
                msg_text.onclick = () => {
                    msg_id = msg_text.getAttribute('id');
                    msg_txt = msg_text.innerText;
                    msg_sender =msg_text.getAttribute('sender');
                    delete_button();
                };
                msg_cont_div.append(msg_name);
                msg_cont_div.append(msg_text);
                msg_cont_div.append(msg_time);
                msg_div.append(msg_cont_div);
                msg_div.append(img_div);
                document.querySelector('#msg_body').append(msg_div);
                $('#'+data.msg_id).linkify();
                document.querySelector('#msg_body').scrollTop = document.querySelector('#msg_body').scrollHeight;
                
            };
        };
        
    });

    // Update users list when someone joins channel, data is one name
    socket.on('joined', data => {
        if (location.pathname == data.channel) {
            var users_list = document.querySelector('#users_list');
            if (users_list != null) {
                var x = false;
                var h4s = users_list.getElementsByClassName('name');
                for (var i=0, len=h4s.length; i<len; i++) {
                    if (h4s[i].innerText == data.user )
                        x = true;
                }
                if (x == false) {
                    const h4 = document.createElement('h4');
                    h4.setAttribute('class', 'name font-weight-light');
                    h4.innerHTML = data.user;
                    users_list.append(h4);
                    var feedback = document.querySelector('#feedback');
                    feedback.style.visibility = 'visible';
                    feedback.innerHTML = data.user + ' has joined';
                    setTimeout( () => {
                        feedback.style.visibility = 'hidden';
                    }, 5000);    
                }
                else {
                    var feedback = document.querySelector('#feedback');
                    feedback.style.visibility = 'visible';
                    feedback.innerHTML = data.user + ' has joined';
                    setTimeout( () => {
                        feedback.style.visibility = 'hidden';
                    }, 5000); 
                }
            };
        };
        
    });

    // Update users list when someone leaves channel, data is list of names still in channel 
    socket.on('left', data => {
        if (location.pathname == data.channel) {
             var users_list = document.querySelector('#users_list');
            if (users_list != null) {
                var h4s = users_list.getElementsByClassName('name');
                for (var i=0, len=h4s.length; i<len; i++) {
                    if (h4s[i] != null) {
                        if (h4s[i].innerHTML == data.user )
                            h4s[i].remove();
                            var feedback = document.querySelector('#feedback');
                            feedback.style.visibility = 'visible';
                            feedback.innerHTML = data.user + ' has left';
                            setTimeout( () => {
                                feedback.style.visibility = 'hidden';
                            }, 5000);  
                        }
                    }    
            };
        };
       
    });

    // When typing, DOM updated for everyone else to show whos typing
    var feedback = document.querySelector('#feedback');
    socket.on('typing', data => {
        if (location.pathname == data.channel) {
            if (feedback != null) {
                if (data.name != localStorage.getItem('display_name')){
                    feedback.style.visibility = 'visible';
                    feedback.innerHTML = data.name + ' is typing...';
                    setTimeout( () => {
                        feedback.style.visibility = 'hidden';
                    }, 3000);    
                }
                else
                    feedback.style.visibility = 'hidden';

            }; 
        };
        
    });

    // deleting fails
    socket.on('delete_declined', () => {
        feedback.style.visibility = 'visible';
        feedback.innerHTML = 'Only allowed to delete own messages';
        setTimeout( () => {
            feedback.style.visibility = 'hidden';
        }, 5000);    
    })

    // deleting allowed
    socket.on('delete', data => {
        if (location.pathname == data.channel) {
            messages = document.getElementsByClassName('msg');
            if (messages.length != 0) {
                for (var i=0, len=messages.length; i<len; i++) {
                    if (messages[i].getAttribute('id') == data.id) {
                        messages[i].innerText = 'Message removed';
                        var id_val = messages[i].getAttribute('id');
                        document.querySelector('#msg'+id_val).classList.add('delete');
                        document.querySelector('#img'+id_val).classList.add('delete_img');
                        setTimeout( () => {
                            document.querySelector('#msg'+id_val).style.display = 'none';
                            document.querySelector('#img'+id_val).style.display = 'none';
                        }, 5000);    

                    };
                    if (messages[i].getAttribute('id') == 'pic-'+data.id) {
                        messages[i].alt = 'Image removed'
                        messages[i].src = '';
                        document.querySelector('#msg'+data.id).classList.add('delete');
                        document.querySelector('#img'+data.id).classList.add('delete_img');
                        setTimeout( () => {
                            document.querySelector('#msg'+data.id).style.display = 'none';
                            document.querySelector('#img'+data.id).style.display = 'none';
                        }, 5000);    
                    };
                };
            };
        }; 
    });

    //search bar for channel checking is channel name existsa dn disabling/enabling join button
    var search = document.querySelector('#search_channel')
    if (search != null) {
        search.addEventListener('input', () => {
        document.querySelector('#search_button').disabled = true;
            if (search.value.length < 1) {
                document.querySelector('#search_button').disabled = true;
            }     
            else {
                $.ajax({
                    type: "POST",
                    url: "/search_channel",
                    data: {
                        search_input: $('#search_channel').val()
                    }
                }).done(function(data) {
                    $('#search_channel').autocomplete({
                        source: data.json_list
                    });
                    document.querySelector('.ui-menu').addEventListener('click', () => {
                        document.querySelector('#search_button').disabled = false;
                    })
                    if (data.channel_correct == true) {
                        document.querySelector('#search_button').disabled = false;
                    }
                    else {
                        document.querySelector('#search_button').disabled = true;
                    } 
                });
            }
            
        });

        
    }

 
    

});

// Make delete button appear when a message is clicked
function delete_button() {
    document.querySelector('#delete_button').style.visibility = 'visible';
    setTimeout( () => {
        document.querySelector('#delete_button').style.visibility = 'hidden';
    }, 5000);
};

