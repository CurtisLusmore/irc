import React from 'react';
import ReactDOM from 'react-dom';

import Client from './components/Client.js';

(function() {
    const app = document.getElementById('app');
    ReactDOM.render(<Client/>, app);
}());