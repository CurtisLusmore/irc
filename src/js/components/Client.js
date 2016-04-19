import React from 'react';

import IrcClient from './IrcClient.js';
import Message from './Message.js';
import {makeUser, split} from '../helpers.js';


/**
 * Class representing a form-backed IRC client.
 */
export default class Client extends React.Component {
    /**
     * Create a new client and the form that provides its input and output.
     * @param {container} The container element to add the form to.
     */
    constructor() {
        super();
        this.state = {
            input: '',
            messages: []
        };
        this.client = new IrcClient('chat.freenode.net', 6667);
        this.client
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
                this.writeMessage(user.nick, ` has quit: ${msg.substring(1)}`);
            })
            .subscribe('JOIN', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.nick, ` has joined ${msg}`);
            })
            .subscribe('PART', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.nick, ` has left ${msg}`);
            })
            .subscribe('NICK', (msg, pre) => {
                var user = makeUser(pre);
                this.writeMessage(user.nick, ` has changed nicknames to ${msg}`);
            })
            .subscribe('PRIVMSG', (msg, pre) => {
                var res = split(msg);
                var channel = res[0];
                var message = res[1].substring(1);
                var user = makeUser(pre);
                this.writeMessage(`${channel}: `, user.nick, `: ${message}`);
            });
        this.client
            .sendCommand('PASS', 'curtispassword')
            .sendCommand('NICK', 'curtis52')
            .sendCommand('USER', 'curtis52', '0', '*', 'curtis');
        this.messageKey = 0;
    }

    /**
     * Send a message to the IRC server.
     * @param {arguments} The components of the message to send.
     */
    sendMessage(ev) {
        console.log(this);
        ev.preventDefault();
        const message = this.state.input;
        this.setState({
            input: ''
        });

        this.client.sendMessage(message);
        return false;
    }

    /**
     * Write a message to the form output. Adds all arguments to a container
     * element which represents a single message.
     * @param {arguments} The components of the message.
     */
    writeMessage() {
        var msg = '';
        for (var ind in arguments) {
            msg += arguments[ind];
        }

        const key = this.messageKey++;
        this.setState({
            messages: this.state.messages.concat([<Message contents={msg} key={key}/>])
        });
        return this;
    }

    handleInputChange(ev) {
        this.setState({
            input: ev.target.value
        });
    }

    render() {
        return (
            <form class="client" onSubmit={this.sendMessage.bind(this)}>
                <div class="client-output" disabled>
                    {this.state.messages}
                </div>
                <input
                    class="client-input"
                    value={this.state.input}
                    onChange={this.handleInputChange.bind(this)}
                    placeholder="JOIN #channel"
                    autofocus />
            </form>
        );
    }
}