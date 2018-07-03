# cocoapods-private-repo
A private CocoaPods repository to host podspecs like SonarKit or any of its dependencies.
In order to publish new podspecs to this private repository you must run `pod repo push` command:
`pod repo push [REPO] [NAME.podspec]`. Please refer to the `pod repo push --help` command in case you need to pass any specific flags to the command.
