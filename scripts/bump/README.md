# bump

A small script for changing version numbers automatically.

## Usage

Requires [stack](http://haskellstack.org/) to be installed.

```
./bump.hs --help
```

Alternatively, use the pre-checked-in binaries from the superfolder
through `bump.sh`.

To bump a release version, just pass the new version number.

```
bump 1.2.3
```

To bump to a snapshot release, run with `--snapshot`:

```
bump --snapshot 1.2.4-SNAPSHOT
```

## Building

To build the native binaries, run

```
stack build
```

The binary is then placed in `.stack-work/install/x86_64-osx/**/bin/bump`.

To cross-compile for Linux (required for internal CI), run

```
stack docker pull
stack build --docker
```
