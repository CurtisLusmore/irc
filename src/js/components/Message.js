import React from 'react';

export default class Message extends React.Component {
    constructor() {
        super();
        this.time = new Date().toLocaleTimeString();
    }

    render() {
        return (
            <div class="client-message">
                <div class="client-message-timestamp">{this.time}</div>
                <div>{this.props.contents}</div>
            </div>
        );
    }
}