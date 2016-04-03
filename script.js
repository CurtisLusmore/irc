'use strict'

const net = require('net');

function split(str, sep, n) {
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
        // console.log(`<<< ${message}`);
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
        // console.log(`>>> ${message}`);

        var res = split(message, ' ', 1);
        var token = res[0];
        message = res[1];
        var prefix, command;
        if (token[0] === ':') {
            prefix = token;
            res = split(message, ' ', 1);
            command = res[0];
            message = res[1];
        } else {
            prefix = null;
            command = token;
        }

        var handle = this.handlers[command] || this.handlers['default'];
        handle(prefix, command, message);
    }
}

class Client {
    constructor(container) {
        var form = document.createElement('form');
        form.className = 'client';
        var output = document.createElement('textarea');
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
            .on('default', (pref, cmd, msg) => {
                this.writeMessage(`[${pref} - ${cmd}] ${msg}`);
            })
            .on('PING', (pref, cmd, msg) => {
                client.sendCommand('PONG', msg);
            })
            .on('NOTICE', (pref, cmd, msg) => {
                this.writeMessage(`NOTICE: ${msg}`);
            })
            .on('JOIN', (pref, cmd, msg) => {
                this.writeMessage(`${pref} has joined ${msg}`);
            })
            .on('PRIVMSG', (pref, cmd, msg) => {
                var res = split(msg, ' ', 1);
                var channel = res[0];
                var message = res[1].substring(1);
                this.writeMessage(`${channel}: ${pref}: ${msg}`);
            })
            .sendCommand('PASS', 'curlpass')
            .sendCommand('NICK', 'curlnick')
            .sendCommand('USER', 'curluser', '0', '*', 'curl real name');

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
        var date = new Date().toLocaleTimeString();
        message = message.trimRight('\n').trimRight('\r');
        if (this.output.value.length > 0) this.output.value += '\n';
        this.output.value += `${date} ${message}`;
        this.output.scrollTop = this.output.scrollHeight;
        return this;
    }
}