# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
    spec.name     = 'Folly-GTest'
    spec.version  = '1.10.7'
    spec.license  = { :type => 'BSD', :file => 'LICENSE' }
    spec.homepage = 'https://github.com/google/googletest.git'
    spec.authors  = { 'Pritesh Nandgaonkar' => 'prit91@fb.com' }
    spec.summary  = 'GTest is googles c++ testing framework'
    spec.source   = { :git => "https://github.com/google/googletest.git",
                      :tag => "release-1.10.0" }
    spec.source_files = "googletest/include/gtest/*.h", 
                        "googletest/include/gtest/internal/*.h", 
                        "googletest/include/gtest/internal/custom/*.h", 
                        "googletest/src/**/*.h",
    spec.preserve_paths = "googletest/include/gtest/**", "googletest/include/gtest/internal/**", "googletest/include/gtest/internal/custom/**"
    # spec.compiler_flags = '-DGTEST_INCLUDE_GTEST_GTEST_SPI_H_=0'
    # spec.public_header_files =  'googletest/include/gtest/*.h'
    spec.ios.deployment_target = '8.0'
    spec.osx.deployment_target = '10.10'
    # spec.header_mappings_dir = 'googletest/include/gtest'
    # spec.header_dir = 'gtest'
    spec.description = "Just the headers of GTest, a c++ testing framework"
    spec.pod_target_xcconfig = {  
                                  "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/googletest/include/**\" \"$(PODS_TARGET_SRCROOT)/googletest/src/**\""
                                }
end
