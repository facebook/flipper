# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
  spec.name = 'Flipper-Folly'
  spec.version = '2.2.0'
  spec.license = { :type => 'Apache License, Version 2.0' }
  spec.homepage = 'https://github.com/facebook/folly'
  spec.summary = 'An open-source C++ library developed and used at Facebook.'
  spec.authors = 'Facebook'
  spec.source = { :git => 'https://github.com/facebook/folly.git',
                  :tag => "v2020.04.06.00"}
  spec.module_name = 'folly'
  spec.dependency 'boost-for-react-native'
  spec.dependency 'Flipper-Glog'
  spec.dependency 'Flipper-DoubleConversion'
  spec.dependency 'OpenSSL-Universal', '1.0.2.19'
  spec.dependency 'CocoaLibEvent', '~> 1.0'
  spec.compiler_flags = '-DFOLLY_HAVE_PTHREAD=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0
    -frtti
    -fexceptions
    -std=c++14
    -Wno-error
    -Wno-unused-local-typedefs
    -Wno-unused-variable
    -Wno-sign-compare
    -Wno-comment
    -Wno-return-type
    -Wno-global-constructors'

  spec.source_files = "folly/*.h",
                      "folly/concurrency/*.h",
                      "folly/container/*.h",
                      "folly/container/detail/*.h",
                      "folly/detail/*.h",
                      "folly/executors/**/*.h",
                      "folly/experimental/*.h",
                      "folly/functional/*.h",
                      "folly/futures/*.h",
                      "folly/futures/detail/*.h",
                      "folly/gen/*.h",
                      "folly/hash/*.h",
                      "folly/hash/detail/*.h",
                      "folly/init/*.h",
                      "folly/io/*.h",
                      "folly/io/async/*.h",
                      "folly/io/async/ssl/*.h",
                      "folly/lang/*.h",
                      "folly/memory/*.h",
                      "folly/memory/detail/*.h",
                      "folly/net/*.h",
                      "folly/net/detail/*.h",
                      "folly/portability/*.h",
                      "folly/ssl/*.h",
                      "folly/ssl/detail/*.h",
                      "folly/synchronization/*.h",
                      "folly/synchronization/detail/*.h",
                      "folly/system/*.h",
                      "folly/tracing/*.h",
                      "folly/chrono/*.h",
                      "folly/*.cpp",
                      "folly/concurrency/*.cpp",
                      "folly/container/detail/*.cpp",
                      "folly/detail/*.cpp",
                      "folly/executors/*.cpp",
                      "folly/experimental/hazptr/*.cpp",
                      "folly/futures/*.cpp",
                      "folly/futures/detail/*.cpp",
                      "folly/hash/*.cpp",
                      "folly/io/*.cpp",
                      "folly/io/async/*.cpp",
                      "folly/io/async/ssl/*.cpp",
                      "folly/lang/*.cpp",
                      "folly/memory/*.cpp",
                      "folly/memory/detail/*.cpp",
                      "folly/net/*.cpp",
                      "folly/portability/*.cpp",
                      "folly/ssl/*.cpp",
                      "folly/ssl/detail/*.cpp",
                      "folly/String.cpp",
                      "folly/synchronization/*.cpp",
                      "folly/system/*.cpp"

  spec.exclude_files = "folly/synchronization/Rcu.cpp", "folly/synchronization/Rcu.h"
  spec.header_mappings_dir = 'folly'
  spec.header_dir          = 'folly'
  spec.libraries           = "stdc++"

  spec.public_header_files =  "folly/**/*.h"

  spec.pod_target_xcconfig = {  "USE_HEADERMAP" => "NO",
                                "CLANG_CXX_LANGUAGE_STANDARD" => "c++11",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/Flipper-DoubleConversion\""
                              }
  spec.platforms = { :ios => "8.0"}
end
