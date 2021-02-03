# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
  spec.name = 'Flipper-RSocket'
  spec.version = '1.1.1'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/rsocket/rsocket-cpp'
  spec.summary = 'C++ implementation of RSocket'
  spec.authors = 'Facebook'
  spec.source = { :git => 'https://github.com/priteshrnandgaonkar/rsocket-cpp.git', :tag => "0.11.0"}
  spec.module_name = 'RSocket'
  spec.static_framework = true
  spec.source_files = 'rsocket/benchmarks/*',
                      'rsocket/framing/*',
                      'rsocket/internal/*',
                      'rsocket/statemachine/*',
                      'rsocket/transports/*',
                      'rsocket/transports/**/*',
                      'yarpl/observable/*',
                      'yarpl/flowable/*',
                      'rsocket/*'

  spec.libraries = "stdc++"
  spec.compiler_flags = '-std=c++1y'
  spec.dependency 'Flipper-Folly', '~> 2.3'
  spec.compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0  -frtti
    -fexceptions
    -std=c++14
    -Wno-error
    -Wno-unused-local-typedefs
    -Wno-unused-variable
    -Wno-sign-compare
    -Wno-comment
    -Wno-return-type
    -Wno-global-constructors'
  spec.preserve_paths = 'rsocket/benchmarks/*.h',
                        'rsocket/framing/*.h',
                        'rsocket/internal/*.h',
                        'rsocket/statemachine/*.h',
                        'rsocket/transports/*.h',
                        'rsocket/*.h',
                        'yarpl/flowable/*.h',
                        'yarpl/observable/*.h',
                        'yarpl/perf/*.h',
                        'yarpl/single/*.h',
                        'yarpl/utils/*.h',
                        'yarpl/*.h',
                        '**/*.h'
  spec.header_mappings_dir = './'
  spec.header_dir = './'
  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/** \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/glog\" \"$(PODS_ROOT)/DoubleConversion\"/**" }
  spec.platforms = { :ios => "9.0" }

end
