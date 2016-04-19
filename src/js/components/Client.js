import React from 'react';

import IrcClient from './IrcClient.js';
import Message from './Message.js';
import Text from './Text.js';
import User from './User.js';
import {split} from '../helpers.js';


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
        var client = new IrcClient('chat.freenode.net', 6667);
        client
            .subscribe('PING', msg => {
                client.sendCommand('PONG', msg);
            })
            .subscribe('NOTICE', msg => {
                var res = split(msg);
                var [recipient, message] = split(msg);
                // var recipient = res[0];
                // var message = res[1].substring(1);
                this.writeMessage(message.substring(1));
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
                var [recipient, _, message] = split(msg, ' ', 2);
                this.writeMessage(message);
            })
            .subscribe(['432', '433', '451'], msg => { // ERR_NICKNAMEINUSE
                var [recipient, message] = split(msg);
                this.writeMessage(message);
            })
            .subscribe(['704', '705', '706'], msg => { // HELP
                var [recipient, _, message] = split(msg, ' ', 2);
                message = message.substring(1).trim();
                if (message !== '') this.writeMessage(message);
            })
            .subscribe('QUIT', (msg, pre) => {
                var user = ind => <User mask={pre} key={ind} />;
                this.writeMessage(user, ' has quit: ', msg.substring(1));
            })
            .subscribe('JOIN', (msg, pre) => {
                var user = ind => <User mask={pre} key={ind} />;
                this.writeMessage(user, ' has joined ', msg);
            })
            .subscribe('PART', (msg, pre) => {
                var user = ind => <User mask={pre} key={ind} />;
                this.writeMessage(user, ' has left ', msg);
            })
            .subscribe('NICK', (msg, pre) => {
                var user = ind => <User mask={pre} key={ind} />;
                this.writeMessage(user, ' has changed nicknames to ', msg.substring(1));
            })
            .subscribe('PRIVMSG', (msg, pre) => {
                var [channel, message] = split(msg);
                message = message.substring(1);
                var user = ind => <User mask={pre} key={ind} />;
                this.writeMessage(channel, ': ', user, ': ', message);
            });
        client
            .sendCommand('PASS', 'curtispassword')
            .sendCommand('NICK', 'curtis52')
            .sendCommand('USER', 'curtis52', '0', '*', 'curtis');
        this.client = client;
        this.messageKey = 0;
    }

    /**
     * Send a message to the IRC server.
     * @param {arguments} The components of the message to send.
     */
    sendMessage(ev) {
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
        var args = Array.apply(null, arguments)
            .map((arg, ind) => typeof(arg) === 'string' ? <Text contents={arg} key={ind} /> : arg(ind));
        const key = this.messageKey++;
        this.setState({
            messages: this.state.messages.concat([<Message contents={args} key={key} />])
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