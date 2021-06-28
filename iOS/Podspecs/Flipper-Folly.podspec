# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
  spec.name = 'Flipper-Folly'
  spec.version = '2.6.7'
  spec.license = { :type => 'Apache License, Version 2.0' }
  spec.homepage = 'https://github.com/facebook/folly'
  spec.summary = 'An open-source C++ library developed and used at Facebook.'
  spec.authors = 'Facebook'
  spec.source = { :git => 'https://github.com/facebook/folly.git',
                  :tag => "v2021.04.26.00"}
  spec.module_name = 'folly'
  spec.dependency 'Flipper-Boost-iOSX'
  spec.dependency 'Flipper-Glog'
  spec.dependency 'Flipper-DoubleConversion'
  spec.dependency 'OpenSSL-Universal', '1.1.1100'
  spec.dependency 'libevent', '~> 2.1.12'
  spec.dependency 'Flipper-Fmt', '7.1.7'
  spec.compiler_flags = '-DFOLLY_HAVE_BACKTRACE=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_PTHREAD=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0
    -frtti
    -fexceptions
    -std=c++14
    -Wno-error
    -Wno-unused-local-typedefs
    -Wno-unused-variable
    -Wno-sign-compare
    -Wno-comment
    -Wno-return-type
    -Wno-global-constructors
    -Wno-comma'

  spec.source_files = "folly/*.h",
                      "folly/concurrency/*.h",
                      "folly/container/*.h",
                      "folly/container/*.cpp",
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
                      "folly/ssl/*.h",
                      "folly/ssl/detail/*.h",
                      "folly/synchronization/*.h",
                      "folly/synchronization/detail/*.h",
                      "folly/synchronization/detail/*.cpp",
                      "folly/system/*.h",
                      "folly/tracing/*.h",
                      "folly/tracing/*.cpp",
                      "folly/chrono/*.h",
                      "folly/chrono/*.cpp",
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
                      "folly/ssl/*.cpp",
                      "folly/ssl/detail/*.cpp",
                      "folly/String.cpp",
                      "folly/synchronization/*.cpp",
                      "folly/system/*.cpp",
                      "folly/experimental/coro/*.h",
                      "folly/experimental/symbolizer/*.h",
                      "folly/experimental/symbolizer/*.cpp",
                      "folly/fibers/*.h",
                      "folly/fibers/*.cpp",
                      "folly/experimental/symbolizer/detail/*.h",
                      "folly/experimental/symbolizer/detail/*.cpp",
                      "folly/logging/*.h",
                      "folly/logging/*.cpp",
                      "folly/experimental/coro/detail/*.h",
                      "folly/experimental/coro/detail/*.cpp",
                      "folly/portability/Unistd.h",
                      "folly/portability/Unistd.cpp",
                      "folly/portability/Config.h",
                      "folly/portability/Constexpr.h",
                      "folly/portability/Builtins.h",
                      "folly/portability/Builtins.cpp",
                      "folly/portability/Malloc.h",
                      "folly/portability/Malloc.cpp",
                      "folly/portability/Math.h",
                      "folly/portability/Asm.h",
                      "folly/portability/OpenSSL.h",
                      "folly/portability/OpenSSL.cpp",
                      "folly/portability/PThread.cpp",
                      "folly/portability/PThread.h",
                      "folly/portability/Windows.h",
                      "folly/portability/SysResource.h",
                      "folly/portability/SysResource.cpp",
                      "folly/portability/Event.h",
                      "folly/experimental/observer/*.h",
                      "folly/experimental/observer/*.cpp",
                      "folly/portability/Time.h",
                      "folly/portability/Time.cpp",
                      "folly/portability/IOVec.h",
                      "folly/portability/SysTypes.h",
                      "folly/portability/GFlags.h",
                      "folly/portability/SysSyscall.h",
                      "folly/portability/SysUio.h",
                      "folly/portability/SysUio.cpp",
                      "folly/portability/SysTime.h",
                      "folly/portability/SysTime.cpp",
                      "folly/portability/SysStat.h",
                      "folly/portability/SysStat.cpp",
                      "folly/portability/SysMman.h",
                      "folly/portability/SysMman.cpp",
                      "folly/portability/Sockets.h",
                      "folly/portability/Sockets.cpp",
                      "folly/portability/SysMembarrier.h",
                      "folly/portability/SysMembarrier.cpp",
                      "folly/portability/SysFile.h",
                      "folly/portability/SysFile.cpp",
                      "folly/portability/String.h",
                      "folly/portability/String.cpp",
                      "folly/portability/Fcntl.h",
                      "folly/portability/Fcntl.cpp",
                      "folly/portability/Stdlib.h",
                      "folly/portability/Stdlib.cpp",
                      "folly/portability/Stdio.h",
                      "folly/portability/Stdio.cpp",
                      "folly/portability/FmtCompile.h",
                      "folly/portability/Sched.h",
                      "folly/portability/Sched.cpp",
                      "folly/experimental/observer/detail/*.h",
                      "folly/experimental/observer/detail/*.cpp",

  spec.exclude_files = "folly/synchronization/Rcu.cpp", "folly/synchronization/Rcu.h"
  spec.header_mappings_dir = 'folly'
  spec.header_dir          = 'folly'
  spec.libraries           = "stdc++"

  spec.public_header_files =  "folly/**/*.h"

  spec.pod_target_xcconfig = {  "USE_HEADERMAP" => "NO",
                                "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/Flipper-Boost-iOSX\" \"$(PODS_ROOT)/Flipper-DoubleConversion\" \"$(PODS_ROOT)/libevent/include\""
                              }
  spec.platforms = { :ios => "10.0"}
end
