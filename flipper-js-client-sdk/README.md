# flipper-sdk-api

SDK to build Flipper clients for JS based apps

## Installation

`yarn add flipper-client-sdk`

## Usage

## Example

```TypeScript
class SeaMammalPlugin extends AbsctractFlipperPlugin {
  getId(): string {
    return 'sea-mammals';
  }

  runInBackground(): boolean {
    return true;
  }

  newRow(row: {id: string, url: string, title: string}) {
    this.connection?.send("newRow", row)
  }
}

const flipperClient = newWebviewClient();
cosnt plugin = new SeaMammalPlugin();
flipperClient.addPlugin();
flipperClient.start('Example JS App');
plugin.newRow({id: '1', title: 'Dolphin', url: 'example.com'})

```
