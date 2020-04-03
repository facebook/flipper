---
id: logs-plugin
title: Logs
---

The Logs plugin shows device logs without any additional setup. This is a device plugin, meaning that it is not tied to any specific app and there is no additional setup needed to see the logs.

![Logs plugin](assets/logs.png)

## Filtering

The search bar can be used to search for logs and filter for certain types. From the context menu on the table headers you can show more infos like timestamp, PID or TID. Click on a tag, PID or TID in the table to filter only for logs with the same value.

## Expression watcher

The expression watcher in the sidebar can be used to watch for certain logs to happen and count how often they occur. An expression can be a simple string, or a regular expression which is matched against the logs.

When the notify checkbox is enabled, Flipper will send notifications once the log is happening. This lets you know when the watcher triggered, even if Flipper is in the background.
