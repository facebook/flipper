# flipper-plugin

`flipper-plugin` is the dependency used by all modern Flipper plugins (project "Tommy").

For background: https://fb.quip.com/YHOGAnaPqAVJ

`flipper-plugin` is to be used as `dev` and `peer` dependency of all Flipper plugins. It provides:

1. (TODO) Standard API's to interact with Flipper, such as the client connection.
2. (TODO) Standard components to organize the UI
3. (TODO) Testing utilities

API's provided by `flipper-plugin` are documented at fbflipper.com (TODO).

There should normally be no need to install `flipper-plugin` as dependency.
Rather, plugins should be scaffolded using `npx flipper-pkg init` (TODO) as documented [here](https://fbflipper.com/docs/tutorial/js-setup)
