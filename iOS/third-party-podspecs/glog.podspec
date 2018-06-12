Pod::Spec.new do |spec|
  spec.name = 'glog'
  spec.version = '0.3.5'
  spec.license = { :type => 'Google', :file => 'COPYING' }
  spec.homepage = 'https://github.com/google/glog'
  spec.summary = 'Google logging module'
  spec.authors = 'Google'
  spec.prepare_command = "#!/bin/bash\nset -e\n\nPLATFORM_NAME=\"${PLATFORM_NAME:-iphoneos}\"\nCURRENT_ARCH=\"${CURRENT_ARCH:-armv7}\"\n\nexport CC=\"$(xcrun -find -sdk $PLATFORM_NAME cc) -arch $CURRENT_ARCH -isysroot $(xcrun -sdk $PLATFORM_NAME --show-sdk-path)\"\nexport CXX=\"$CC\"\n\n# Remove automake symlink if it exists\nif [ -h \"test-driver\" ]; then\n    rm test-driver\nfi\n\n./configure --host arm-apple-darwin\n\n# Fix build for tvOS\ncat << EOF >> src/config.h\n\n/* Add in so we have Apple Target Conditionals */\n#ifdef __APPLE__\n#include <TargetConditionals.h>\n#include <Availability.h>\n#endif\n\n/* Special configuration for AppleTVOS */\n#if TARGET_OS_TV\n#undef HAVE_SYSCALL_H\n#undef HAVE_SYS_SYSCALL_H\n#undef OS_MACOSX\n#endif\n\n/* Special configuration for ucontext */\n#undef HAVE_UCONTEXT_H\n#undef PC_FROM_UCONTEXT\n#if defined(__x86_64__)\n#define PC_FROM_UCONTEXT uc_mcontext->__ss.__rip\n#elif defined(__i386__)\n#define PC_FROM_UCONTEXT uc_mcontext->__ss.__eip\n#endif\nEOF"
  spec.source = { :git => 'https://github.com/google/glog.git',
                  :tag => "v#{spec.version}" }
  spec.module_name = 'glog'
  spec.header_dir = 'glog'
  spec.source_files = 'src/logging.cc',
                      'src/utilities.h',
                      'src/utilities.cc',
                      'src/glog/*.h',
                      'src/glog/*.cc',
                      'src/base/mutex.h',
                      'src/base/mutex.cc',
                      'src/glog/*.h',
                      'src/demangle.cc',
                      'src/logging.cc',
                      'src/raw_logging.cc',
                      'src/signalhandler.cc',
                      'src/symbolize.cc',
                      'src/utilities.cc',
                      'src/vlog_is_on.cc'
  # workaround for https://github.com/facebook/react-native/issues/14326
  spec.preserve_paths = 'src/*.h',
                        'src/base/*.h'
  spec.exclude_files       = "src/windows/**/*"
  spec.libraries           = "c++"
  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "CLANG_CXX_LANGUAGE_STANDARD" => "c++11",
                                "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/src"
                                }
  spec.compiler_flags = '-std=c++1y'
  spec.libraries           = "stdc++"
  spec.platforms = { :ios => "8.0"}

end
