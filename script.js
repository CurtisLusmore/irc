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

function event() {
    var subscribers = {};
    var nextId = 0;
    return {
        subscribe: function (handler, predicate) {
            var ids = [];
            var unsubscriber = function () {
                for (var ind in ids) {
                    delete subscribers[ids[ind]];
                }
            };
            unsubscriber.subscribe = function (handler, predicate) {
                var id = nextId++;
                ids.push(id);
                subscribers[id] = {
                    handler: handler,
                    predicate: predicate || (() => true)
                };
                return this;
            };
            unsubscriber.subscribe(handler, predicate);
            return unsubscriber;
        },
        notify: function () {
            for (var id in subscribers) {
                var subscriber = subscribers[id];
                if (subscriber.predicate.apply(null, arguments)) {
                    subscriber.handler.apply(null, arguments);
                }
            }
        }
    };
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
        this.recvEvent = event();
    }

    subscribe(target, handler) {
        var predicate;
        switch (typeof(target)) {
            case 'string':
                predicate = (msg, pre, cmd) => target === cmd;
                break;
            case 'object':
                predicate = (msg, pre, cmd) => target.includes(cmd);
                break;
            default:
                predicate = target;
                break;
        }
        this.recvEvent.subscribe(handler, predicate);
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

        this.recvEvent.notify(message, prefix, command);
    }
}

function makeUser(mask) {
    var res = split(mask, '!');
    var nick = res[0].substring(1);
    res = split(res[1], '@');
    var span = document.createElement('span');
    span.innerText = nick;
    span.className = 'tooltip';
    var tooltip = document.createElement('span');
    tooltip.innerText = mask;
    tooltip.className = 'tooltiptext';
    span.appendChild(tooltip);
    return {
        mask: mask,
        nick: nick,
        user: res[0].substring(1),
        domain: res[1],
        span: span
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
        input.placeholder = 'JOIN #channel';
        form.appendChild(input);
        form.onsubmit = () => this.sendMessage();
        container.appendChild(form);

        var client = new IrcClient('chat.freenode.net', 6667);
        client
            .subscribe('PING', msg => {
                client.sendCommand('PONG', msg);
            })
            .subscribe('NOTICE', msg => {
                var res = split(msg);
                var recipient = res[0];
                var message = res[1].substring(1);
                this.writeMessage(message);
            })
            // .subscribe(['001', '002', '003'], msg => { // Welcome
            //     var res = split(msg);
            //     var message = res[1].substring(1);
            //     this.writeMessage(message);
            // })
            // .subscribe(['004', '005'], msg => { // info
            //     var res = split(msg);
            //     var message = res[1];
            //     this.writeMessage(message);
            // })
            .subscribe(['353', '366'], msg => { // NAMES
                var res = split(msg, ' ', 2);
                var message = res[2];
                this.writeMessage(message);
            })
            .subscribe(['432', '433', '451'], msg => { // ERR_NICKNAMEINUSE
                var res = split(msg);
                var message = res[1];
                this.writeMessage(message);
            })
            .subscribe(['704', '705', '706'], msg => { // HELP
                var res = split(msg, ' ', 2);
                this.writeMessage(res[2]);
            })
            .subscribe('QUIT', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.span, ` has quit: ${msg.substring(1)}`);
            })
            .subscribe('JOIN', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.span, ` has joined ${msg}`);
            })
            .subscribe('PART', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.span, ` has left ${msg}`);
            })
            .subscribe('NICK', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.span, ` has changed nicknames to ${msg}`);
            })
            .subscribe('PRIVMSG', (msg, pre) => {
                var res = split(msg);
                var channel = res[0];
                var message = res[1].substring(1);
                var user = makeUser(pre);
                this.writeMessage(`${channel}: `, user.span, `: ${message}`);
            });
        client
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

    writeMessage() {
        if (arguments.length === 1 && arguments[0] === '') {
            console.log('empty');
        }
        var elem = document.createElement('div');
        for (var ind in arguments) {
            var argument = arguments[ind];
            elem.appendChild(argument instanceof HTMLElement ? argument : document.createTextNode(argument));
        }
        return this.writeElement(elem);
    }

    writeElement(elem) {
        var scrollToBottom = this.output.scrollTop + this.output.clientHeight + 1 >= this.output.scrollHeight;

        var container = document.createElement('div');
        container.className = 'client-message';
        var date = document.createElement('div');
        date.innerText = new Date().toLocaleTimeString();
        date.className = 'client-message-timestamp';
        container.appendChild(date);
        container.appendChild(elem);
        this.output.appendChild(container);

        if (scrollToBottom) { this.output.scrollTop = this.output.scrollHeight; }
        return this;
    }
}