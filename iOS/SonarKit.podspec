folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '~> 1.8'
yogakit_version = '1.8.1'

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
  spec.platforms = { :ios => "8.0" }
  spec.default_subspecs = "Core"
  spec.compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'

  spec.subspec "Core" do |ss|
    ss.dependency 'Folly'
    ss.dependency 'Sonar'
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'PeerTalk'
    ss.dependency 'OpenSSL-Static', '1.0.2.c1'


    ss.source_files = 'SonarKit/FBDefines/*.{h,cpp,m,mm}', 'SonarKit/CppBridge/*.{h,mm}', 'SonarKit/FBCxxUtils/*.{h,mm}', 'SonarKit/Utilities/**/*.{h,m}', 'SonarKit/*.{h,m,mm}'
    ss.public_header_files = 'SonarKit/**/{SonarClient,SonarPlugin,SonarConnection,SonarResponder,SKMacros,FBMacros}.h'

    header_search_paths = "\"$(PODS_TARGET_SRCROOT)\"/SonarKit/** \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/PeerTalkSonar\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                             "DEFINES_MODULE" => "YES",
                             "HEADER_SEARCH_PATHS" => header_search_paths }
  end

  spec.subspec "SonarKitLayoutPlugin" do |ss|
    ss.header_dir = "SonarKitLayoutPlugin"
    ss.dependency             'SonarKit/Core'
    ss.dependency             "Yoga", yoga_version
    ss.dependency             'YogaKit', yogakit_version
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SonarKitLayoutPlugin.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKTouch.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKDescriptorMapper.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKNodeDescriptor.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKInvalidation.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKNamed.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKTapListener.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKObject.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/SKHighlightOverlay.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/UIColor+SKSonarValueCoder.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKObjectHash.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKSwizzle.h',
                              'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/utils/SKYogaKitHelper.h'
    ss.source_files         = 'Plugins/SonarKitLayoutPlugin/SonarKitLayoutPlugin/**/*.{h,cpp,m,mm}'
  end

  spec.subspec "SonarKitLayoutComponentKitSupport" do |ss|
    ss.header_dir = "SonarKitLayoutComponentKitSupport"
    ss.dependency             'SonarKit/Core'
    ss.dependency             "Yoga", yoga_version
    ss.dependency             "ComponentKit"
    ss.dependency             "SonarKit/SonarKitLayoutPlugin"
    ss.public_header_files = 'Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h',
                             'Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SKComponentLayoutWrapper.h'

    ss.source_files         = "Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/Plugins/**" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.header_dir = "SonarKitNetworkPlugin"
    ss.dependency             'SonarKit/Core'
    ss.public_header_files = 'Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKDispatchQueue.h',
                             'Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h'
    ss.source_files         = "Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/Plugins/**" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.header_dir = "SKIOSNetworkPlugin"
    ss.dependency 'SonarKit/Core'
    ss.dependency  'SonarKit/SonarKitNetworkPlugin'
    ss.public_header_files = 'Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\"/Plugins/**" }
  end
end
