---
id: error-handling
title: Error Handling
---

Errors in Flipper plugins should be hidden from the user while providing actionable data to the plugin developer.

## Android

To gracefully handle errors in Flipper we provide the `ErrorReportingRunnable` and `FlipperResponder` classes.

A `FlipperResponder` instance is provided to the client plugin on every method call, and allows for it to return results. When an error occurs during a Flipper method call that can't be handled, pass the error to the responder. This will let the desktop plugin handle it, and if it doesn't, the error will be displayed in the DevTools console.

`ErrorReportingRunnable` is a custom `Runnable` which catches all exceptions, stopping them from crashing the application and reports them to Flipper. These error messages will show up in the DevTools console.

```java
new ErrorReportingRunnable(mConnection) {
  @Override
  public void runOrThrow() throws Exception {
    mightThrowException();
  }
}.run();
```

Executing this block of code will always finish without error but may transfer any silent errors to the Flipper desktop app. During plugin development these java stack traces are surfaced in the chrome dev console.

Always use `ErrorReportingRunnable` for error handling instead of `try`/`catch` or even worse letting errors crash the app. With ErrorReportingRunnable you won't block anyone and you won't hide any stack traces.

## C++

To gracefully handle errors in Flipper we perform all transactions inside of a try block which catches all exceptions, stopping them from crashing the application and reporting them to the plugin developer. This includes your own customs implementations of `FlipperPlugin::didConnect()` and `FlipperConnection::send()` and `::receive()`!

That means you can safely throw exceptions in your plugin code. The exception messages will be sent to the Flipper desktop app. During plugin development the exception messages are surfaced in the Chrome dev console.

If your plugin performs asynchronous work in which exceptions are thrown, these exceptions will not be caught by the Flipper infrastructure. You should handle them appropriately.
