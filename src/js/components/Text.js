import React from 'react';

/**
 * A text component.
 */
export default class Text extends React.Component {
    render() {
        return (
            <span>{this.props.contents}</span>
        );
    }
}