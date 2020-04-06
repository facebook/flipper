# flipper-pkg

`flipper-pkg` is a **work-in-progress** tool for bundling and publishing
Flipper plugins.

<!-- toc -->
* [flipper-pkg](#flipper-pkg)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g flipper-pkg
$ flipper-pkg COMMAND
running command...
$ flipper-pkg (-v|--version|version)
flipper-pkg/0.35.0 darwin-x64 node-v12.15.0
$ flipper-pkg --help [COMMAND]
USAGE
  $ flipper-pkg COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flipper-pkg bundle DIRECTORY`](#flipper-pkg-bundle-directory)
* [`flipper-pkg help [COMMAND]`](#flipper-pkg-help-command)

## `flipper-pkg bundle DIRECTORY`

bundle a plugin folder into a distributable archive

```
USAGE
  $ flipper-pkg bundle DIRECTORY

OPTIONS
  -o, --output=output  [default: .] Where to output the bundle, file or directory. Defaults to '.'.

EXAMPLE
  $ flipper-pkg bundle path/to/plugin
```

_See code: [src/commands/bundle.ts](https://github.com/facebook/flipper/blob/v0.35.0/src/commands/bundle.ts)_

## `flipper-pkg help [COMMAND]`

display help for flipper-pkg

```
USAGE
  $ flipper-pkg help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_
<!-- commandsstop -->


## License

[MIT](LICENSE)
