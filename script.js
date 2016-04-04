'use strict'

const net = require('net');

function split(str, sep, n) {
    if (sep === undefined) { sep = ' '; }
    if (n === undefined) { n = 1; }
    var items = [];
    while (n-- > 0 && str.length > 0) {
        var index = str.indexOf(sep);
        var item = str.substring(0, index);
        str = str.substring(index+1);
        items.push(item);
    }
    if (str.length > 0) items.push(str);
    return items;
}

class IrcClient {
    constructor(host, port) {
        var socket = new net.Socket();
        socket.setEncoding('ascii');
        socket.connect({
            host: host,
            port: port
        });
        socket.on('data', data => this.receiveData(data));

        this.socket = socket;
        this.buffer = '';
        this.handlers = {};
    }

    on(event, fn) {
        this.handlers[event] = fn;
        return this;
    }

    sendMessage(message) {
        console.log(`<<< ${message}`);
        this.socket.write(message + '\r\n');
        return this;
    }

    sendCommand() {
        var args = Array.apply(null, arguments);
        this.sendMessage(args.join(' '));
        return this;
    }

    receiveData(data) {
        this.buffer += data;
        var index;
        while (this.buffer.length > 0 && (index = this.buffer.indexOf('\n')) !== -1) {
            var message = this.buffer.substring(0, index);
            this.buffer = this.buffer.substring(index+1);
            this.receiveMessage(message);
        }
    }

    receiveMessage(message) {
        console.log(`>>> ${message}`);

        var res = split(message);
        var token = res[0];
        message = res[1];
        var prefix, command;
        if (token[0] === ':') {
            prefix = token;
            res = split(message);
            command = res[0];
            message = res[1];
        } else {
            prefix = null;
            command = token;
        }

        var handle = this.handlers[command] || this.handlers['default'];
        handle(message, prefix, command);
    }
}

function makeUser(mask) {
    var res = split(mask, '!');
    var nick = res[0];
    res = split(res, '@');
    return {
        mask: mask,
        nick: nick,
        user: res[0],
        domain: res[1]
    };
}

class Client {
    constructor(container) {
        var form = document.createElement('form');
        form.className = 'client';
        var output = document.createElement('div');
        output.className = 'client-output';
        output.disabled = true;
        form.appendChild(output);
        var input = document.createElement('input');
        input.className = 'client-input';
        input.autofocus = true;
        form.appendChild(input);
        form.onsubmit = () => this.sendMessage();
        container.appendChild(form);

        var client = new IrcClient('chat.freenode.net', 6667)
            .on('default', (msg, pre, cmd) => {
                this.writeMessage(`DEFAULT MESSAGE [${pre} - ${cmd}] ${msg}`);
            })
            .on('PING', msg => {
                client.sendCommand('PONG', msg);
            })
            .on('NOTICE', msg => {
                var res = split(msg);
                var recipient = res[0];
                var message = res[1];
                this.writeMessage(`NOTICE: ${message}`);
            })
            .on('QUIT', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(`${user.nick} has quit: ${msg}`);
            })
            .on('JOIN', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(`${user.nick} has joined ${msg}`);
            })
            .on('PART', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(`${user.nick} has left ${msg}`);
            })
            .on('NICK', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(`${user.nick} has changed nicknames to ${msg}`);
            })
            .on('PRIVMSG', (msg, pre) => {
                var res = split(msg);
                var channel = res[0];
                var message = res[1];
                this.writeMessage(`${channel}: ${pre}: ${message}`);
            })
            .on('353', msg => {
                this.writeMessage(`>>>${msg}<<<`);
            })
            .sendCommand('PASS', 'curtispassword')
            .sendCommand('NICK', 'curtis52')
            .sendCommand('USER', 'curtis52', '0', '*', 'curtis');

        this.form = form;
        this.input = input;
        this.output = output;
        this.client = client;
    }

    sendMessage() {
        var message = this.input.value;
        this.input.value = '';

        this.client.sendMessage(message);
        return false;
    }

    writeMessage(message) {
        var scrollToBottom = this.output.scrollTop + this.output.clientHeight + 1 >= this.output.scrollHeight;

        var date = new Date().toLocaleTimeString();
        var item = document.createElement('div');
        item.className = 'client-message';
        item.innerText = `${date} ${message}`;
        this.output.appendChild(item);

        if (scrollToBottom) { this.output.scrollTop = this.output.scrollHeight; }
        return this;
    }
}