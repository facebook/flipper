package com.facebook.flipper.nativeplugins;

public interface NativePlugin {
  String getTitle();

  RawNativePlugin asFlipperPlugin();
}
