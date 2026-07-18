import { render } from 'ink';
import React from 'react';
import { App } from './App.js';

process.stdout.write('\x1b[48;2;13;17;23m\x1Bc');

const { waitUntilExit } = render(React.createElement(App));

waitUntilExit().then(() => {
  process.stdout.write('\x1b[0m\x1Bc');
  process.exit(0);
});
