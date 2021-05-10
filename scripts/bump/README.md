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

## Updating the binaries

The platform-specific binaries in the parent directory (`bump.lnx64` and `bump.mac`)
need to be manually updated after every change to the source here.

To do this, first build the binary for Mac:

```
stack build
cp .stack-work/install/x86_64-osx/<build_id>/8.6.5/bin/bump ../bump.mac
```

(The build ID is printed as part of the stack build run.)

Then, add this to the options from above to produce static binaries on Linux
(otherwise, there's a good chance Sandcastle won't run it). The binary section
should then look like this:

*package.yaml*
```diff
diff --git a/xplat/sonar/scripts/bump/package.yaml b/xplat/sonar/scripts/bump/package.yaml
--- a/xplat/sonar/scripts/bump/package.yaml
+++ b/xplat/sonar/scripts/bump/package.yaml
@@ -12,3 +12,4 @@
   bump:
     source-dirs:      .
     main:             bump.hs
+    ghc-options:      -optl-static -optl-pthread -fPIC

```

With the docker daemon running, execute:

```
stack build --docker
cp .stack-work/install/x86_64-linux-<image_id>/<build_id>/8.6.5/bin/bump ../bump.lnx64
```

Commit the changes, done.
