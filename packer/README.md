# Flipper Packer

A tool for splitting a Flipper build into smaller artifacts that can be
distributed and cached separately.

**N.B. Buck build files are not included in the open-source export of this
tool.**

## Building

With cargo:

```
$ cargo build
```

With Buck:

```
$ buck build :packer
```

## Testing

With cargo:

```
$ cargo test
```

With Buck:

```
buck test :packer
```

## Usage

See help page:

```
$ cargo run -- --help
flipper-packer 0.4.0
Facebook, Inc.
Helper tool that breaks down a Flipper release into smaller artifacts.

USAGE:
    flipper-packer [OPTIONS] <PLATFORM>

ARGS:
    <PLATFORM>    Platform to build for

OPTIONS:
    -d, --dist <DIST>            Flipper dist directory to read from [default:
                                 ~/fbsource/xplat/sonar/dist]
    -h, --help                   Print help information
        --no-compression         Skip compressing the archives (for debugging)
    -o, --output <OUTPUT>        Directory to write output files to [default: .]
    -p, --packlist <PACKLIST>    Custom list of files to pack
    -V, --version                Print version information
```

Buck:

```
buck run :packer
```
