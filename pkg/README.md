# flipper-pkg

`flipper-pkg` is a **work-in-progress** tool for bundling and publishing
Flipper plugins.

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mycli
$ mycli COMMAND
running command...
$ mycli (-v|--version|version)
mycli/0.0.0 darwin-x64 node-v12.14.0
$ mycli --help [COMMAND]
USAGE
  $ mycli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mycli hello [FILE]`](#mycli-hello-file)
* [`mycli help [COMMAND]`](#mycli-help-command)

## `mycli hello [FILE]`

describe the command here

```
USAGE
  $ mycli hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ mycli hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/passy/mycli/blob/v0.0.0/src/commands/hello.ts)_

## `mycli help [COMMAND]`

display help for mycli

```
USAGE
  $ mycli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_
<!-- commandsstop -->


## License

[MIT](LICENSE)
