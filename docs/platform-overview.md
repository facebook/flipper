---
id: platform-overview
title: Platform Overview
sidebar_label: Platform Overview
---

Sonar defines a protocol that is currently implemented for Android and iOS clients. However, clients can be implemented for any platform according to the specifications described here.

Sonar client implementations consist of two layers. The `SonarClient` and a set of SonarPlugins. The `SonarClient` implement the Sonar web socket protocol. For more information on implementing a `SonarClient` see [Building a SonarClient](sonar-client.md). Currently we have implementations of `SonarClient` for Android and iOS.

Sonar plugins are implementations of a SonarPlugin interface. Client plugins are the way client expose data to the Sonar desktop plugins. These client plugins speak to cross platform javascript plugins written for the Sonar desktop app. This means that as long as the client plugins for your platform implements the expected plugin API you are able to re-use a lot of the existing Sonar plugin ecosystem. To find out more about supporting some of the existing plugins visit Supporting layout inspection and Supporting network inspection.
