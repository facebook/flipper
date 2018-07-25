# Establishing a Connection

## Transport Protocol

Sonar uses [RSocket](http://rsocket.io/) to communicate between the desktop and mobile apps. RSocket allows for bi-directional communication.

## Client-Server relationship

When the desktop app starts up, it opens a secure socket on port 8088.
Any mobile app with the sonar SDK installed will continually attempt to connect to this port on localhost to establish a connection with the desktop app.

## Certificate Exchange

To avoid mobile apps from connecting to untrusted ports on localhost, the SDK requires the server to use a trusted certificate.
In order for the mobile app to know which certificates it can trust, it goes through a certificate exchange step before connecting for the first time.

This is achieved through the following steps:
* Desktop app starts an insecure server on port 8089.
* Mobile SDK connects to localhost:8089 and sends a Certificate Signing Request to the desktop app.
* The desktop app uses it's private key (this is generated once and stored in ~/.sonar) to sign a client certificate for the mobile app.
* The desktop uses ADB (for android), or the mounted file system (for iOS simulators) to write the following files to the mobile app's private data partition
  * Server certificate that the mobile SDK can now trust.
  * Client certificate for the mobile app to use going forward.
* Now the mobile sdk knows which server certificate it can trust, and can connect to the secure server.

This allows the mobile app to trust a certificate if and only if, it is stored inside it's internal data partition. Typically it's only possible to write there with physical access to the device (i.e. through ADB or a mounted simulator).
