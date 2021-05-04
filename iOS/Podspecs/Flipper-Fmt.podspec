# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
    spec.name     = 'Flipper-Fmt'
    spec.version  = '7.1.7'
    spec.license  = { :type => 'MIT' }
    spec.homepage = 'https://github.com/fmtlib/fmt'
    spec.authors  = { 'Pritesh Nandgaonkar' => 'prit91@fb.com' }
    spec.summary  = '{fmt} is an open-source formatting library providing a fast and safe alternative to C stdio and C++ iostreams.    '

    spec.source   = { :git => "https://github.com/priteshrnandgaonkar/fmt.git",
                      :tag => "7.1.7" }
    spec.source_files = "src/format.cc", "include/**/*.h",
    spec.public_header_files = "include/**/*.h"
    spec.requires_arc = true
    spec.ios.deployment_target = '10.0'
    spec.header_dir = 'fmt'
    spec.libraries = "stdc++" 
    spec.exclude_files = "src/fmt.cc", "src/fmt.cc"
    spec.pod_target_xcconfig = {  "USE_HEADERMAP" => "NO",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/include/\""
  }
end
