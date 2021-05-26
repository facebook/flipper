# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |s|
    s.name         = "Flipper-Boost-iOSX"
    s.version      = "1.76.0.1.11"
    s.summary      = "Boost C++ libraries"
    s.homepage     = "https://github.com/priteshrnandgaonkar/boost-iosx"
    s.license      = "Boost Software License"
    s.author       = { "Pritesh Nandgaonkar" => "prit91@fb.com" }
    s.ios.deployment_target = "10.0"
    s.osx.pod_target_xcconfig = { 'ONLY_ACTIVE_ARCH' => 'YES' }
    s.ios.pod_target_xcconfig = { 'ONLY_ACTIVE_ARCH' => 'YES' }
    s.static_framework = true
    s.source       = { :git => "https://github.com/priteshrnandgaonkar/Flipper-Boost-iOSX.git", :tag => "1.76.0.1.11" }
    s.module_name = 'boost'
    s.header_dir = 'boost'
    s.preserve_path = 'boost', 'asm'
    s.source_files = 'asm/ontop_combined_all_macho_gas.S', 'asm/make_combined_all_macho_gas.S', 'asm/jump_combined_all_macho_gas.S'
    s.pod_target_xcconfig = {  "USE_HEADERMAP" => "NO",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/Flipper-Boost-iOSX/asm\""
  }
end
