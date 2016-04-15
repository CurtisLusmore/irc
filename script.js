'use strict'

const net = require('net');

/**
 * Split a string with the given separator at most n times.
 * @param {str} The string to split.
 * @param {sep} The separator to split on.
 * @param {n} The maximum number of splits to make.
 * @return An array of substrings.
 */
function split(str, sep, n) {
    if (sep === undefined) { sep = ' '; }
    if (n === undefined) { n = 1; }
    var items = [];
    while (n-- > 0 && str.length > 0) {
        var index = str.indexOf(sep);
        var item = str.substring(0, index);
        str = str.substring(index+sep.length);
        items.push(item);
    }
    if (str.length > 0) items.push(str);
    return items;
}

/**
 * Create a new event. The event has a subscribe method and a notify method.
 *
 * The subscribe method returns a callable which will unsubscribe when called,
 * and can also have its subscribe method called to make further subscriptions.
 * The subscribe methods take two function handles, the first is the callback
 * which is called when the event is notified, the second is a predicate which
 * must return true if the callback is to be invoked. The second argument is
 * optional, if missing the callback is always called.
 *
 * The notify method takes any number of arguments and notifies all subscribers
 * by calling the predicate and callback functions with the supplied arguments.
 *
 * @return A new event.
 */
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

/**
 * A class representing an IRC client. Allows sending and receiving of messages
 * to/from an IRC server.
 */
class IrcClient {
    /**
     * Create a new IRC client.
     * @param {host} The hostname of the server to connect to.
     * @param {port} The port number of the server to connect to.
     */
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

    /**
     * Subscribe to messages received by the IRC server.
     * @param {target} The target message/s to subscribe to. If a string,
     *     matches messages of the supplied command. If a list, matches
     *     messages of any of the supplied commands. If a predicate, matches
     *     messages whose command satisfies the predicate.
     * @param {handler} The callback function. Receives the message, prefix and
     *     command.
     * @return A callable to unsubscribe.
     */
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

    /**
     * Send a message to the IRC server.
     * @param {message} The message to send.
     */
    sendMessage(message) {
        console.log(`<<< ${message}`);
        this.socket.write(message + '\r\n');
        return this;
    }

    /**
     * Send a command to the IRC server, by joining the array of arguments
     * with spaces.
     * @param {arguments} The arguments that make up the command.
     */
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

/**
 * Parse the given user mask to create a user object.
 * @param {mask} The user mask.
 * @return A user object containing the mask, nick, user, domain and a HTML
 *     span.
 */
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

/**
 * Class representing a form-backed IRC client.
 */
class Client {
    /**
     * Create a new client and the form that provides its input and output.
     * @param {container} The container element to add the form to.
     */
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
                var msg = res[2].substring(1).trim();
                if (msg !== '') this.writeMessage(msg);
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

    /**
     * Send a message to the IRC server.
     * @param {arguments} The components of the message to send.
     */
    sendMessage() {
        var message = this.input.value;
        this.input.value = '';

        this.client.sendMessage(message);
        return false;
    }

    /**
     * Write a message to the form output. Adds all arguments to a container
     * element which represents a single message.
     * @param {arguments} The components of the message.
     */
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

    /**
     * Write a HTML element to the form output.
     * @param {elem} A HTML element.
     */
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