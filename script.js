'use strict'

const net = require('net');

class IrcClient {
    constructor(host, port) {
        var socket = new net.Socket();
        socket.setEncoding('ascii');
        socket.connect({
            host: host,
            port: port
        });

        this.socket = socket;
    }

    on(event, fn) {
        this.socket.on(event, fn);
    }

    sendMessage(message) {
        this.socket.write(message + '\r\n');
    }
}

class Client {
    constructor(container) {
        var form = document.createElement('form');
        var output = document.createElement('textarea');
        form.appendChild(output);
        var input = document.createElement('input');
        form.appendChild(input);
        form.onsubmit = () => this.sendMessage();
        container.appendChild(form);

        var client = new IrcClient('chat.freenode.net', 6667);
        client.on('data', data => {
            output.value += data;
            output.scrollTop = output.scrollHeight;
        });

        client.sendMessage('PASS curtispassword');
        client.sendMessage('NICK curtis52');
        client.sendMessage('USER curtis52 0 * :Curtis')

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
}