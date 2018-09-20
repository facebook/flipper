folly_compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '~> 1.9'
yogakit_version = '~>1.8'
sonarkit_version = '0.7.2'
Pod::Spec.new do |spec|
  spec.name = 'FlipperKit'
  spec.version = sonarkit_version
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/Sonar'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  spec.static_framework = true
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :tag=> "v"+sonarkit_version }
  spec.module_name = 'FlipperKit'
  spec.platforms = { :ios => "8.4" }
  spec.default_subspecs = "Core"

  # This subspec is necessary since FBMacros.h is imported as <FBDefines/FBMacros.h>
  # inside SKMacros.h, which is a public header file. Defining this directory as a
  # subspec with header_dir = 'FBDefines' allows this to work, even though it wouldn't
  # generally (you would need to import <FlipperKit/t/FBDefines/FBMacros.h>)
  spec.subspec 'FBDefines' do |ss|
    ss.header_dir = 'FBDefines'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FBDefines/**/*.h'
    ss.public_header_files = 'iOS/FBDefines/**/*.h'
  end

  spec.subspec 'CppBridge' do |ss|
    ss.header_dir = 'CppBridge'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/CppBridge/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other SonarKit source files
    ss.private_header_files = 'iOS/FlipperKit/CppBridge/**/*.h'
    ss.preserve_path = 'FlipperKit/CppBridge/**/*.h'
  end

  spec.subspec 'FBCxxUtils' do |ss|
    ss.header_dir = 'FBCxxUtils'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FBCxxUtils/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other SonarKit source files
    ss.private_header_files = 'iOS/FlipperKit/FBCxxUtils/**/*.h'
  end

  spec.subspec "Core" do |ss|
    ss.dependency 'FlipperKit/FBDefines'
    ss.dependency 'FlipperKit/FBCxxUtils'
    ss.dependency 'FlipperKit/CppBridge'
    ss.dependency 'Folly', '~>1.1'
    ss.dependency 'Sonar', '~>'+sonarkit_version
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'PeerTalk', '~>0.0.2'
    ss.dependency 'OpenSSL-Static', '1.0.2.c1'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FBDefines/*.{h,cpp,m,mm}', 'iOS/FlipperKit/CppBridge/*.{h,mm}', 'iOS/FlipperKit/FBCxxUtils/*.{h,mm}', 'iOS/FlipperKit/Utilities/**/*.{h,m}', 'iOS/FlipperKit/*.{h,m,mm}'
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'iOS/FBDefines/FBMacros.h',
                             'iOS/FlipperKit/**/{FlipperStateUpdateListener,FlipperClient,FlipperPlugin,FlipperConnection,FlipperResponder,SKMacros}.h'
    header_search_paths = "\"$(PODS_ROOT)/FlipperKit/iOS/FlipperKit\" \"$(PODS_ROOT)\"/Headers/Private/FlipperKit/** \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/PeerTalkSonar\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                             "DEFINES_MODULE" => "YES",
                             "HEADER_SEARCH_PATHS" => header_search_paths }
  end

  spec.subspec "FlipperKitLayoutPlugin" do |ss|
    ss.header_dir = "FlipperKitLayoutPlugin"
    ss.dependency             'FlipperKit/Core'
    ss.dependency             'Yoga', yoga_version
    ss.dependency             'YogaKit', yogakit_version
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKTouch.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKDescriptorMapper.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKNodeDescriptor.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKInvalidation.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKNamed.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKTapListener.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKObject.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKHighlightOverlay.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/UIColor+SKSonarValueCoder.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKObjectHash.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKSwizzle.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKYogaKitHelper.h'
    ss.source_files         = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/**/*.{h,cpp,m,mm}'
  end

  spec.subspec "SonarKitLayoutComponentKitSupport" do |ss|
    ss.header_dir = "SonarKitLayoutComponentKitSupport"
    ss.dependency             'FlipperKit/Core'
    ss.dependency             'Yoga', yoga_version
    ss.dependency             'ComponentKit'
    ss.dependency             'FlipperKit/FlipperKitLayoutPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.dependency             'FlipperKit/FlipperKitLayoutPlugin'
    ss.public_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SKComponentLayoutWrapper.h'

    ss.source_files         = "iOS/Plugins/FlipperKitLayoutPlugin/SonarKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.header_dir = "SonarKitNetworkPlugin"
    ss.dependency             'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.header_dir = "SKIOSNetworkPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.dependency 'FlipperKit/SonarKitNetworkPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end
end
