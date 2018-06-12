Pod::Spec.new do |spec|
  spec.name = 'Folly'
  spec.version = '2018.05.07.00'
  spec.license = { :type => 'Apache License, Version 2.0' }
  spec.homepage = 'https://github.com/facebook/folly'
  spec.summary = 'An open-source C++ library developed and used at Facebook.'
  spec.authors = 'Facebook'
  spec.source = { :git => 'https://github.com/facebook/folly.git',
                  :tag => "v#{spec.version}" }
  spec.module_name = 'folly'
  spec.dependency 'boost-for-react-native'
  spec.dependency 'DoubleConversion'
  spec.dependency 'glog'
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
  spec.source_files = 'folly/Executor.cpp',
                      'folly/memory/detail/MallocImpl.cpp',
                      'folly/String.cpp',
                      'folly/*.cpp',
                      'folly/ScopeGuard.h',
                      'folly/lang/ColdClass.cpp',
                      'folly/lang/Assume.h',
                      'folly/lang/Assume.cpp'

  # workaround for https://github.com/facebook/react-native/issues/14326
  spec.preserve_paths = 'folly/*.h',
                        'folly/portability/*.h',
                        'folly/lang/*.h',
                        'folly/functional/*.h',
                        'folly/detail/*.h',
                        'folly/hash/*.h',
                        'folly/memory/*.h',
                        'folly/**/*.h'

  spec.header_mappings_dir = 'folly'
  spec.header_dir = 'folly'
  spec.libraries           = "stdc++"
  spec.private_header_files = 'folly/portability/Stdlib.h',
                              'folly/portability/Malloc.h',
                              'folly/portability/Stdlib.h',
                              'folly/portability/Stdio.h',
                              'folly/portability/PThread.h'
  spec.public_header_files = 'folly/portability/Config.h',
                              'folly/Executor.h',
                              'folly/Function.h',
                              'folly/Utility.h',
                              'folly/Portability.h',
                              'folly/Traits.h',
                              'folly/functional/Invoke.h',
                              'folly/CPortability.h',
                              'folly/dynamic.h',
                              'folly/json_pointer.h',
                              'folly/Expected.h',
                              'folly/Preprocessor.h',
                              'folly/Optional.h',
                              'folly/Unit.h',
                              'folly/Utility.h',
                              'folly/lang/ColdClass.h',
                              'folly/CppAttributes.h',
                              'folly/json.h',
                              'folly/Range.h',
                              'folly/hash/SpookyHashV2.h',
                              'folly/lang/Exception.h',
                              'folly/portability/Constexpr.h',
                              'folly/CpuId.h',
                              'folly/Likely.h',
                              'folly/detail/RangeCommon.h',
                              'folly/detail/RangeSse42.h',
                              'folly/portability/String.h',
                              'folly/dynamic-inl.h',
                              'folly/Conv.h',
                              'folly/Demangle.h',
                              'folly/FBString.h',
                              'folly/hash/Hash.h',
                              'folly/memory/Malloc.h',
                              'folly/**/*.h',
                              'folly/memory/detail/MallocImpl.h',
                              'folly/String.h',
                              'folly/*.h'

  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++11",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\"" }

  # Pinning to the same version as React.podspec.
  spec.platforms = { :ios => "8.0", :tvos => "10.0" }
end
