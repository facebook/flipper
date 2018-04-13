---
id: error-handling
title: Error Handling
sidebar_label: Error Handling
---

Errors in Sonar plugins should be hidden from the user while providing actionable data to the plugin developer.

## Android

To gracefully handle errors in Sonar we provide the `ErrorReportingRunnable` class. This is a custom runnable which catches all exceptions, stopping them from crashing the application and reporting them to the plugin developer.

```java
new ErrorReportingRunnable(mConnection) {
  @Override
  public void runOrThrow() throws Exception {
    mightThrowException();
  }
}.run();
```

Executing this block of code will always finish without error but may transfer any silences error to the Sonar desktop app. During plugin development these java stack traces are surfaced in the chrome dev console. In production the errors are instead sent to and a task is assigned so that you can quickly deploy a fix.

Always use `ErrorReportingRunnable` for error handling instead of `try`/`catch` or even worse letting errors crash the app. With ErrorReportingRunnable you won't block anyone and you won't hide any stack traces.

## C++

To gracefully handle errors in Sonar we perform all transactions inside of a try block which catches all exceptions, stopping them from crashing the application and reporting them to the plugin developer. This includes your own customs implementations of `SonarPlugin::didConnect()` and `SonarConnection::send()` and `::receive()`!

That means you can safely throw exceptions in your plugin code. The exception messages will be sent to the Sonar desktop app. During plugin development the exception messages are surfaced in the Chrome dev console.

If your plugin performs asynchronous work in which exceptions are thrown, these exceptions will not be caught by the Sonar infrastructure. You should handle them appropriately.
