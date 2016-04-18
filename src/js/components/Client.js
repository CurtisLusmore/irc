import IrcClient from './IrcClient.js';
import {makeUser, split} from '../helpers.js';


/**
 * Class representing a form-backed IRC client.
 */
export default class Client {
    /**
     * Create a new client and the form that provides its input and output.
     * @param {container} The container element to add the form to.
     */
    constructor(container) {
        const form = document.createElement('form');
        form.className = 'client';
        const output = document.createElement('div');
        output.className = 'client-output';
        output.disabled = true;
        form.appendChild(output);
        const input = document.createElement('input');
        input.className = 'client-input';
        input.autofocus = true;
        input.placeholder = 'JOIN #channel';
        form.appendChild(input);
        form.onsubmit = () => this.sendMessage();
        container.appendChild(form);

        const client = new IrcClient('chat.freenode.net', 6667);
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