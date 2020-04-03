---
id: share-flipper-data
title: Share Flipper Data
---

Flipper's diagnostic and profiling data is often used for debugging. But sometimes you can not solve the problem on your own and need some help from your colleagues. Rather than just sending screenshots, you can share the data you are seeing in Flipper with them. This includes all logs, the layout hierarchy, network requests, etc. and helps to get the bigger picture of why something didn't work as expected.

## Export Flipper Data

You can export Flipper's data in a `.flipper` file. For the export to work, an active device needs to be connected to Flipper. Make sure you have selected the device you want to export in Flipper's device dropdown:

![selectedDevice](assets/shareFlipperData/selectedDevice.png)

To export Flipper's into a file, select "File" → "Export" from the menu bar and save it where ever you like. This file now can be shared with your colleagues.

**Caution:** Bear in mind that the file will include all the data available to the plugins, including for example any access tokens in recorded network requests.

## Import Flipper Data

Opening a `.flipper` file imports all the data and allows you to use Flipper as if the device was connected. However, note the device is marked as "offline". This means, while you are able to see all the date, you can not interact with it (e.g. change a view's background color), because the actual device is not present.

![importedDevice](assets/shareFlipperData/importedDevice.png)

For advanced users, Flipper also provides a URL handler to import data. Linking to `flipper://import/?url={LINK_TO_FLIPPER_FILE}` will launch Flipper and display the downloaded data.
