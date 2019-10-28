# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

folly_compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yoga_version = '~> 1.9'
yogakit_version = '~>1.8'
sonarkit_version = '0.7.2'
Pod::Spec.new do |spec|
  spec.name = 'SonarKit'
  spec.version = sonarkit_version
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/Sonar'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  spec.static_framework = true
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :tag=> "v"+sonarkit_version }
  spec.module_name = 'SonarKit'
  spec.platforms = { :ios => "8.4" }
  spec.default_subspecs = "Core"

  # This subspec is necessary since FBMacros.h is imported as <FBDefines/FBMacros.h>
  # inside SKMacros.h, which is a public header file. Defining this directory as a
  # subspec with header_dir = 'FBDefines' allows this to work, even though it wouldn't
  # generally (you would need to import <SonarKit/FBDefines/FBMacros.h>)
  spec.subspec 'FBDefines' do |ss|
    ss.header_dir = 'FBDefines'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FBDefines/**/*.h'
    ss.public_header_files = 'iOS/FBDefines/**/*.h'
  end

  spec.subspec 'CppBridge' do |ss|
    ss.header_dir = 'CppBridge'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/SonarKit/CppBridge/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other SonarKit source files
    ss.private_header_files = 'iOS/SonarKit/CppBridge/**/*.h'
    ss.preserve_path = 'SonarKit/CppBridge/**/*.h'
  end

  spec.subspec 'FBCxxUtils' do |ss|
    ss.header_dir = 'FBCxxUtils'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/SonarKit/FBCxxUtils/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other SonarKit source files
    ss.private_header_files = 'iOS/SonarKit/FBCxxUtils/**/*.h'
  end

  spec.subspec "Core" do |ss|
    ss.dependency 'SonarKit/FBDefines'
    ss.dependency 'SonarKit/FBCxxUtils'
    ss.dependency 'SonarKit/CppBridge'
    ss.dependency 'Folly', '~>1.1'
    ss.dependency 'Sonar', '~>'+sonarkit_version
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'PeerTalk', '~>0.0.2'
    ss.dependency 'OpenSSL-Static', '1.0.2.c1'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/SonarKit/FBDefines/*.{h,cpp,m,mm}', 'iOS/SonarKit/CppBridge/*.{h,mm}', 'iOS/SonarKit/FBCxxUtils/*.{h,mm}', 'iOS/SonarKit/Utilities/**/*.{h,m}', 'iOS/SonarKit/*.{h,m,mm}'
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h',
                             'iOS/FBDefines/FBMacros.h',
                             'iOS/SonarKit/**/{FlipperStateUpdateListener,SonarClient,SonarPlugin,SonarConnection,SonarResponder,SKMacros}.h'
    header_search_paths = "\"$(PODS_ROOT)/SonarKit/iOS/SonarKit\" \"$(PODS_ROOT)\"/Headers/Private/SonarKit/** \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/PeerTalkSonar\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                             "DEFINES_MODULE" => "YES",
                             "HEADER_SEARCH_PATHS" => header_search_paths }
  end

  spec.subspec "SonarKitLayoutPlugin" do |ss|
    ss.header_dir = "SonarKitLayoutPlugin"
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
    ss.header_dir = "SonarKitLayoutComponentKitSupport"
    ss.dependency             'SonarKit/Core'
    ss.dependency             'Yoga', yoga_version
    ss.dependency             'ComponentKit'
    ss.dependency             'SonarKit/SonarKitLayoutPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.dependency             'SonarKit/SonarKitLayoutPlugin'
    ss.public_header_files = 'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/SKComponentLayoutWrapper.h'

    ss.source_files         = "iOS/Plugins/SonarKitLayoutPlugin/SonarKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/SonarKit/**" }
  end

  spec.subspec "SonarKitNetworkPlugin" do |ss|
    ss.header_dir = "SonarKitNetworkPlugin"
    ss.dependency             'SonarKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/SonarKitNetworkPlugin.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SonarKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/SonarKit/**" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.header_dir = "SKIOSNetworkPlugin"
    ss.dependency 'SonarKit/Core'
    ss.dependency 'SonarKit/SonarKitNetworkPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/SonarKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/SonarKit/**" }
  end
end
