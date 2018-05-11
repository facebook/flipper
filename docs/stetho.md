---
id: stetho
title: Stetho Guidance
sidebar_label: Stetho Guidance
---

In 2015, we introduced [Stetho](http://facebook.github.io/stetho/), our Android debugging bridge built on top of Chrome dev tools. While it was a valuable tool to us and many members of the community, we felt that it limited us in what we could do with it. Stetho is Android-only and while Chrome dev tools gave us a nice foundation to build upon, they also limited us in what we could do. Stetho is an Android tool and Chrome dev tools is built for web developers. This means we can only provide a good experience for the intersection of those two development environments which was very limiting. With Sonar being build as a standalone app, we can do more things, like handling adb connections and supporting iOS, which wouldn't be possible from there.

This is why we built Sonar. With the learnings we made while building Stetho in mind, we wanted to create a platform that gives us all the flexibility we need to build more advanced features and support for iOS. One of Sonar's core concept is it's extensibility using [plugins](create-plugin.md). Plugins are written in react and we provide a set of ready-to-use UI components that allows developers to build great plugin UIs with a few lines of code.

While offering many new features, Sonar also already covers most of the features provided by Stetho. This includes network and layout inspection, and an advance log viewer. However, we are aware that not every single feature is currently supported by Sonar. However, we are committed to continuously improve Sonar and adding new features and plugins. If you are using a particular feature in Stetho with isn't supported by Sonar, we are more than happy to hear about these use-cases. Stetho will continue to work and we are not abandoning it. So you can choose the tool that fits your needs best. But we are confident to suite most use-cases with Sonar and are more than happy to accept contributions from the open-source community adding new features to Sonar.
