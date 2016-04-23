import React from 'react';

import Text from './Text.js';
import {split} from '../helpers.js';


/**
 * Class representing a user on an IRC server.
 * @prop {mask} The user mask.
 */
export default class User extends React.Component {
    constructor(props) {
        super(props);
        const mask = props.mask;
        var [nick, res] = split(mask, '!');
        nick = nick.substring(1);
        var [user, domain] = split(res[1], '@');
        user = user.substring(1);
        this.state = {
            mask: mask,
            nick: nick,
            user: user,
            domain: domain
        };
    }

    render() {
        return (
            <span class="tooltip">
                <Text contents={this.state.nick} />
                <span class="tooltiptext">
                    {this.state.mask}
                </span>
            </span>
        );
    }
}