folly_compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '~> 1.9'
yogakit_version = '~>1.8'

Pod::Spec.new do |spec|
  spec.name = 'SonarKit'
  spec.version = '0.0.1'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/Sonar'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  spec.static_framework = true
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :branch=> "master" }
  spec.module_name = 'SonarKit'
  spec.platforms = { :ios => "8.4" }

  spec.subspec "Core" do |ss|
    ss.dependency 'Folly', '~>1.0'
    ss.dependency 'Sonar', '~>0.0.1'
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'PeerTalk', '~>0.0.2'
    ss.dependency 'OpenSSL-Static', '1.0.2.c1'
    ss.source_files = 'iOS/FBDefines/*.{h,cpp,m,mm}', 'iOS/SonarKit/**/*.{h,cpp,m,mm}', 'iOS/SonarKit/FBCxxUtils/*.{h, mm}'
    ss.public_header_files = 'iOS/SonarKit/CppBridge/*.{h}',
                               'iOS/SonarKit/SonarClient.h',
                               'iOS/SonarKit/SonarDeviceData.h',
                               'iOS/SonarKit/SonarPlugin.h',
                               'iOS/SonarKit/SonarResponder.h',
                               'iOS/SonarKit/SonarConnection.h',
                               'iOS/SonarKit/SKMacros.h'

    ss.compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/** \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/PeerTalkSonar\" \"$(PODS_ROOT)/ComponentKit\"/**" }
  end

  spec.subspec "SonarKitLayoutPlugin" do |ss|
    ss.dependency             'SonarKit/Core'
    ss.dependency             'Yoga', yoga_version
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
    ss.dependency             'SonarKit/Core'
    ss.dependency             'Yoga', yoga_version
    ss.dependency             'ComponentKit'
    ss.dependency             'SonarKit/SonarKitLayoutPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SKComponentLayoutWrapper.h'

    ss.source_files         = "iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.dependency             'SonarKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKDispatchQueue.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.dependency             'SonarKit/Core'
    ss.dependency  'SonarKit/SonarKitNetworkPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                 "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"" }
  end
end
