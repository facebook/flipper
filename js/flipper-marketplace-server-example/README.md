### Flipper Marketplace

Used by the marketplace feature of Flipper: https://github.com/facebook/flipper/pull/3491

### Modification
Each NPM server will require to write it's own adapter to get the list of available plugins.
In the example `npmAdapter`, the code is writtent for the [verdaccio.co](https://verdaccio.org).
The expected output of this adapter is a list of available plugins.

### Usage
1. Start server `yarn && yarn start`
2. Enable marketplace in Flipper settings & set `Martkeplace URL` to `http://localhost:4004/flipper-plugins` 