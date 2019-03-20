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

**Easiest Way**

1. Double click the `.flipper` file, it would automatically open Flipper and import its data. So cool! 😎

**From UI**

1) Open Flipper and click on the “File” in the menu bar

2) Click Open File...

   Or


1) Open Flipper and click on the device dropdown

2) Find the Open File... option at the bottom of the dropdown

   Or


  Use Shortcut ⌘O

3) A dialog will show up, select the file and click on Open

4) You will now have imported the Flipper data. You would see an offline (archived device) being created, which looks like the following image.


![importedDevice](/docs/assets/shareFlipperData/importedDevice.png)


For any queries and bugs, please create a GitHub [issue](https://github.com/facebook/flipper/issues/).
