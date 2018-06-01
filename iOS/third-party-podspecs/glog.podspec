Pod::Spec.new do |spec|
  spec.name = 'glog'
  spec.version = '0.3.5'
  spec.license = { :type => 'Google', :file => 'COPYING' }
  spec.homepage = 'https://github.com/google/glog'
  spec.summary = 'Google logging module'
  spec.authors = 'Google'
  spec.prepare_command = File.read("../scripts/ios-configure-glog.sh")
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
