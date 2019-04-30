---
id: share-flipper-data
title: Share Flipper Data 📦
---

Flipper provides rich diagnostic and profiling data. It's used by mobile engineers to debug issues. It lets you share what you're seeing from your Flipper application, so other developers can open it and explore a snapshot of the data, as if they had the device connected.

## Export Flipper Data

You can export Flipper data as a `.flipper` file. For the export to work, there should be an active device connected to the Flipper application. Make sure you have a device connected to Flipper, by looking for the device name in the following rectangle in the toolbar of the Flipper application:

![selectedDevice](/docs/assets/shareFlipperData/selectedDevice.png)

To export Flipper data as a `.flipper` file, follow these steps:

1. Click on “File” in the menu bar.
2. Click on “Export”.
3. Click on “File...”.
4. You can combine the above steps by using the shortcut ⌘E.
5. After the above steps, a dialog allows you to select the location and change the filename.
6. Wait for the file to appear at the specified location. No loading indicator appears in this case (we are working on it).
7. Once the file appears, share the file with your colleagues. **Bear in mind that the file will include all the data available to the plugins, including any access tokens in the recorded network requests.**

## Import Flipper Data

There are multiple ways to open a `.flipper` file.

**Directly from finder**

Double click the `.flipper` file to launch the app with that device snapshot.

**From within Flipper**

Choose "Open File..." from either the Devices dropdown menu or the File menu (or keyboard shortcut ⌘O) and select the file to import.

This will load the snapshot as an offline device, which will look like this:

![importedDevice](/docs/assets/shareFlipperData/importedDevice.png)

**flipper:// URL handler**

For advanced users, flipper is a registered handler for URLs of the form `flipper://import...` so if you download a .flipper file from a link like this, Flipper will launch directly from the browser and display the downloaded snapshot.
