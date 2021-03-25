# Flipper Packer

A tool for splitting a Flipper build into smaller artifacts that can be distributed and cached separately.

**N.B. Buck build files are not included in the open-source export of this tool.**

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
$ buck test :packer
```

## Usage

See help page:

```
$ cargo run -- --help
flipper-packer 0.3.0
Facebook, Inc.
Split the Flipper distribution into smaller, cacheable artifacts

USAGE:
    flipper-packer [FLAGS] [OPTIONS] <PLATFORM>

FLAGS:
    -h, --help              Prints help information
        --no-compression    Skip compressing the archives (for debugging)
    -p, --packlist          Custom list of files to pack.
    -V, --version           Prints version information

OPTIONS:
    -d, --dist <DIRECTORY>      Flipper dist directory to read from. [default: ~/fbsource/xplat/sonar/dist]
    -o, --output <DIRECTORY>    Directory to write output files to. [default: .]

ARGS:
    <PLATFORM>    Platform to build for [possible values: Mac, Linux, Windows]
```

Buck:

```
$ buck run :packer
```
