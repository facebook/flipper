# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

folly_compiler_flags = '-DFLIPPER_OSS=1 -DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '~> 1.9'
yogakit_version = '~>1.8'
flipperkit_version = '0.15.0'
Pod::Spec.new do |spec|
  spec.name = 'FlipperKit'
  spec.version = flipperkit_version
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/Sonar'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  spec.static_framework = true
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :tag=> "v"+flipperkit_version }
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
    # by other FlipperKit source files
    ss.private_header_files = 'iOS/FlipperKit/CppBridge/**/*.h'
    ss.preserve_path = 'FlipperKit/CppBridge/**/*.h'
  end

  spec.subspec 'FBCxxUtils' do |ss|
    ss.header_dir = 'FBCxxUtils'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FBCxxUtils/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other FlipperKit source files
    ss.private_header_files = 'iOS/FlipperKit/FBCxxUtils/**/*.h'
  end

  spec.subspec "FKPortForwarding" do |ss|
    ss.header_dir = "FKPortForwarding"
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'PeerTalk', '~>0.0.2'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FKPortForwarding/FKPortForwarding{Server,Common}.{h,m}'
    ss.private_header_files = 'iOS/FlipperKit/FKPortForwarding/FKPortForwarding{Server,Common}.h'
  end


  spec.subspec "Core" do |ss|
    ss.dependency 'FlipperKit/FBDefines'
    ss.dependency 'FlipperKit/FBCxxUtils'
    ss.dependency 'FlipperKit/CppBridge'
    ss.dependency 'FlipperKit/FKPortForwarding'
    ss.dependency 'Folly', '~>1.2'
    ss.dependency 'Flipper', '~>'+flipperkit_version
    ss.dependency 'OpenSSL-Static', '1.0.2.c1'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FBDefines/*.{h,cpp,m,mm}', 'iOS/FlipperKit/CppBridge/*.{h,mm}', 'iOS/FlipperKit/FBCxxUtils/*.{h,mm}', 'iOS/FlipperKit/*.{h,m,mm}'
    ss.public_header_files = 'iOS/Plugins/FlipperKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h',
                             'iOS/Plugins/FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKTapListener.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKInvalidation.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKDescriptorMapper.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/FlipperKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/SKSubDescriptor.h',
                             'iOS/FBDefines/FBMacros.h',
                             'iOS/Plugins/FlipperKitExamplePlugin/FlipperKitExamplePlugin/FlipperKitExamplePlugin.h',
                             'iOS/Plugins/FlipperKitCrashReporterPlugin/FlipperKitCrashReporterPlugin/FlipperKitCrashReporterPlugin.h',
                             'iOS/FlipperKit/**/{FlipperDiagnosticsViewController,FlipperStateUpdateListener,FlipperClient,FlipperPlugin,FlipperConnection,FlipperResponder,SKMacros}.h'
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
    ss.public_header_files  = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKTapListener.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKInvalidation.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKDescriptorMapper.h'
    ss.private_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKTouch.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKNodeDescriptor.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKNamed.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKObject.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKHighlightOverlay.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/UIColor+SKSonarValueCoder.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKObjectHash.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKSwizzle.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/utils/SKYogaKitHelper.h'
    ss.source_files         = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/**/*.{h,cpp,m,mm}'
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitLayoutComponentKitSupport" do |ss|
    ss.header_dir = "FlipperKitLayoutComponentKitSupport"
    ss.dependency             'FlipperKit/Core'
    ss.dependency             'Yoga', yoga_version
    ss.dependency             'ComponentKit'
    ss.dependency             'FlipperKit/FlipperKitLayoutPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.dependency             'FlipperKit/FlipperKitLayoutPlugin'
    ss.public_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/FlipperKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/SKSubDescriptor.h'
    ss.source_files         = "iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitNetworkPlugin" do |ss|
    ss.header_dir = "FlipperKitNetworkPlugin"
    ss.dependency             'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.header_dir = "SKIOSNetworkPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.dependency 'FlipperKit/FlipperKitNetworkPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/FlipperKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitUserDefaultsPlugin" do |ss|
    ss.header_dir = "FlipperKitUserDefaultsPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitUserDefaultsPlugin/**/*.{h,m}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitExamplePlugin" do |ss|
    ss.header_dir = "FlipperKitExamplePlugin"
    ss.dependency 'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitExamplePlugin/FlipperKitExamplePlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitExamplePlugin/**/*.{h,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end
end
