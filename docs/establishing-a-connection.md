# Establishing a Connection

Below is an outline of how a connection is established between an app with with our SDK integrated, and the desktop app. This all goes on behind the scenes inside the mobile SDK, so users shouldn't need to worry about it.

## Transport Protocol

Flipper uses [RSocket](http://rsocket.io/) to communicate between the desktop and mobile apps. RSocket allows for bi-directional communication.

## Client-Server relationship

When the desktop app starts up, it opens a secure socket on port 8088.
Any mobile app with the Flipper SDK installed will continually attempt to connect to this port on localhost to establish a connection with the desktop app.

## Certificate Exchange

To avoid mobile apps from connecting to untrusted ports on localhost, they will only connect to servers that have a valid, trusted TLS certificate.
In order for the mobile app to know which certificates it can trust, it conducts a certificate exchange with the desktop app before making it can make its first secure connection.

This is achieved through the following steps:
* Desktop app starts an insecure server on port 8089.
* Mobile app connects to localhost:8089 and sends a Certificate Signing Request to the desktop app.
* Desktop app uses it's private key (this is generated once and stored in ~/.sonar) to sign a client certificate for the mobile app.
* The desktop uses ADB (for android), or the mounted file system (for iOS simulators) to write the following files to the mobile app's private data partition
  * Server certificate that the mobile app can now trust.
  * Client certificate for the mobile app to use going forward.
* Now the mobile app knows which server certificate it can trust, and can connect to the secure server.

This allows the mobile app to trust a certificate if and only if, it is stored inside it's internal data partition. Typically it's only possible to write there with physical access to the device (i.e. through ADB or a mounted simulator).
