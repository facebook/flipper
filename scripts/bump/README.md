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

This is a moving target, but if you don't end up with a static binary, add
`ghc-options: -optl-static -optl-pthread -fPIC` to your executables section.

The binary can get quite large. Enabling split objects in your global config
can be quite effective in reducing it:

`~/.stack/config.yaml`:

```
build:
  split-objs: true
```
