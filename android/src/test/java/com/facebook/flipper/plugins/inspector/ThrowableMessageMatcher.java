package com.facebook.flipper.plugins.inspector;

import org.hamcrest.Description;
import org.hamcrest.TypeSafeMatcher;

/** Match a throwable with a given message. */
class ThrowableMessageMatcher extends TypeSafeMatcher<Throwable> {
  private final String mMessage;

  public static ThrowableMessageMatcher hasThrowableWithMessage(String message) {
    return new ThrowableMessageMatcher(message);
  }

  ThrowableMessageMatcher(String message) {
    mMessage = message;
  }

  @Override
  public void describeTo(Description description) {
    description.appendText("a throwable with message ").appendText(mMessage);
  }

  @Override
  protected boolean matchesSafely(Throwable item) {
    return item.getMessage().equals(mMessage);
  }
}
