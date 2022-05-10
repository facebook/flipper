# headless-demo

**Experimental feature!**

Flipper can run plugins in a headless mode - expose their API over the wire. This is a simple example of how it might look like.

## Quick start

0. Run `yarn` from this repo to install dependencies
0. Start Flipper Server: from `desktop` folder run `yarn flipper-server`
0. Start an Android device
0. Run `yarn start` from this repo

## What happens under the hood

0. This script connects to Flipper via WebSockets
0. It fetches a list of devices
0. It fetches a list of available headless plugins for the Android device
0. It activates `headless-demo` plugin
0. It sends `increment` command to the plugin
