folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '1.8.1'
yogakit_version = '1.8.1'

Pod::Spec.new do |spec|
  spec.name = 'SonarKit'
  spec.version = '0.0.1'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/Sonar'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  # spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :branch=> "master" }
  spec.module_name = 'SonarKit'
  spec.dependency 'Folly'
  spec.dependency 'Sonar'
  spec.dependency 'CocoaAsyncSocket', '~> 7.6'
  spec.dependency 'PeerTalk'
  spec.dependency 'OpenSSL-Universal', '~> 1.0'
  spec.source_files = 'iOS/FBDefines/*.{h,cpp,m,mm}', 'iOS/SonarKit/**/*.{h,cpp,m,mm}', 'iOS/SonarKit/FBCxxUtils/*.{h, mm}',
  spec.public_header_files = 'iOS/SonarKit/CppBridge/*.{h}',
                             'iOS/SonarKit/FBCxxUtils/*.{h}',
                             'iOS/SonarKit/SonarClient.h',
                             'iOS/SonarKit/SonarDeviceData.h',
                             'iOS/SonarKit/SonarPlugin.h',
                             'iOS/SonarKit/SonarResponder.h',
                             'iOS/SonarKit/SonarConnection.h',
                             'iOS/SonarKit/SKMacros.h'

  spec.private_header_files = 'iOS/Sample/'
  spec.compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/** \"$(PODS_ROOT)/boost-for-react-native\"  \"/usr/local/include\" \"/usr/local/Cellar/openssl/1.0.2o_1/include\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/ComponentKit\"/**" }
  spec.platforms = { :ios => "8.0", :tvos => "9.2" }

  spec.subspec "SonarKitLayoutPlugin" do |ss|
    ss.dependency             "Yoga", yoga_version
    ss.dependency             'YogaKit', yogakit_version
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SonarKitLayoutPlugin.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKTouch.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKDescriptorMapper.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKNodeDescriptor.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKInvalidation.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKNamed.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKTapListener.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKObject.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKHighlightOverlay.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/UIColor+SKSonarValueCoder.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKObjectHash.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKSwizzle.h',
                              'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKYogaKitHelper.h'
    ss.source_files         = 'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/**/*.{h,cpp,m,mm}'
  end

  spec.subspec "SonarKitLayoutComponentKitSupport" do |ss|
    ss.dependency             "Yoga", yoga_version
    ss.dependency             "ComponentKit"
    ss.dependency             "SonarKit/SonarKitLayoutPlugin"
    ss.public_header_files = 'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SKComponentLayoutWrapper.h'

    ss.source_files         = "iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKDispatchQueue.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKDispatchQueue.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.dependency  'SonarKit/SonarKitNetworkPlugin'
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end
end
