---
id: understand
title: Understanding Sonar
sidebar_label: Understanding Sonar
---

## Intro

The Sonar desktop app and the mobile native SDK establish a web-socket connection which is used to send data to and from the device. Sonar does not make any restrictions on what kind of data is being sent. This enables a lot of different use-cases where you want to better understand what is going inside your app. For example you can visualize the state of local caches, events happening or trigger actions on your app from the desktop.

## Plugins

Sonar itself only provides the architectural platform. What makes it useful are the plugins built on top of this: Logs, layout or network inspector are all plugins. Plugins can be built very specific to your business logic and the use-cases you have in your app.

A plugin always consists of the native implementation sending and receiving data and the desktop plugin visualizing data in most cases. Learn more on how to [create a plugin](). The native implementations are usually written in Java or Objective-C, the desktop UI is written in React.
