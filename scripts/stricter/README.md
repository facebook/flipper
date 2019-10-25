# stricter

A tool for enforcing a strictly decreasing number of TypeScript
strict mode violations. All this tool does is run `tsc --strict`
on the current and the previous (Mercurial) revision,
compares the error count. If there are more errors than before,
a positive exit code is raised and the regressions printed.

## Usage

Requires [stack](http://haskellstack.org/) to be installed.

```
./stricter.hs
```

Bear in mind that this is hard-coded to Mercurial, so you'll
need to make some changes first if you want to use this in
git repositories.

## Building

To build the native binaries, run

```
stack build
```

The `stricter.lnx64` binary in the parent directory is the result
of building this on a Linux machine so we can run this more quickly
in our CI environment.
