import { render } from 'ink';
import React from 'react';
import { App } from './App.js';

// Clear terminal before rendering TUI
process.stdout.write('\x1Bc');

const { waitUntilExit } = render(React.createElement(App));

waitUntilExit().then(() => {
  process.exit(0);
});
