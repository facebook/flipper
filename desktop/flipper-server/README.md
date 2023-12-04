# flipper-server (TBD)

Stand alone Flipper server as NodeJS process. Used for device communication and also provides a webserver to serve flipper-ui.

Flipper-server can be used as background process, for example on CI servers or to power IDE plugins.

## Running flipper server

### From NPM

TODO:

### From source

```
cd <Flipper checkout>/desktop
yarn install
yarn flipper-server
```

### Production build from source

```
cd <Flipper checkout>/desktop
yarn install
yarn build:flipper-server
```

Pass the `--open` flag to open Flipper server after building

Use `--no-rebuild-plugins` to speed up subsequent builds if default plugins have been build already
