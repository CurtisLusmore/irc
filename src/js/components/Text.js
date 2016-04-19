import React from 'react';

export default class Text extends React.Component {
    render() {
        return (
            <span>{this.props.contents}</span>
        );
    }
}