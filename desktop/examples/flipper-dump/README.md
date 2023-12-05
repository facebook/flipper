# flipper-dump

Stand alone Flipper command, that uses flipper-server to connect to apps and dump all incoming messages.

To get started, run `yarn install` in the `desktop/` folder once.

This package is currently a proof of concept and can be used like:

`yarn start --device='iPhone 12' --client='Instagram' --plugin='AnalyticsLogging'`

Or to capture all output to a file (meta messages will be printed on STDERR):

`yarn --silent start --device='iPhone 12' --client='Instagram' --plugin='AnalyticsLogging' > out.txt`

Future features:

* [ ] Package so that it can be run using `npx`
* [ ] Support filter & transformation functions
* [ ] See `TODO`s in code
* [ ] Support better configuration
* [ ] Custom formatting
* [ ] [FB] Support Certificate Exchange clients
