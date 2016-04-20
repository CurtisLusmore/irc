import {Socket} from 'net';
import {event, split} from '../helpers.js';


/**
 * A class representing an IRC client. Allows sending and receiving of messages
 * to/from an IRC server.
 */
export default class IrcClient {
    /**
     * Create a new IRC client.
     * @param {host} The hostname of the server to connect to.
     * @param {port} The port number of the server to connect to.
     */
    constructor(host, port) {
        const socket = new Socket();
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
        const message = Array.apply(null, arguments).join(' ');
        this.sendMessage(message);
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

        var [token, message] = split(message);
        var prefix, command;
        if (token[0] === ':') {
            prefix = token;
            [command, message] = split(message);
        } else {
            prefix = null;
            command = token;
        }

        this.recvEvent.notify(message, prefix, command);
    }
}