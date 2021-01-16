# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
    spec.name     = 'Folly-Format'
    spec.version  = '7.1.3'
    spec.homepage = 'https://fmt.dev/latest/index.html'
    spec.authors  = { 'Pritesh Nandgaonkar' => 'prit91@fb.com' }
    spec.summary  = '{fmt} is an open-source formatting library providing a fast and safe alternative to C stdio and C++ iostreams.'
    spec.module_name = 'fmt'
    spec.source   = { :git => "https://github.com/fmtlib/fmt.git",
                      :tag => "7.1.3" }
    spec.source_files = 'src/*.{h,cc}', 'include/fmt/*.h'
    spec.public_header_files =  'include/*/*.h'
    spec.requires_arc = true
    spec.ios.deployment_target = '8.0'
    spec.osx.deployment_target = '10.10'
    spec.header_mappings_dir = 'include/fmt'
    spec.libraries           = "stdc++"
    spec.header_dir = 'fmt'
    spec.description = "{fmt} is an open-source formatting library providing a fast and safe alternative to C stdio and C++ iostreams."
    spec.pod_target_xcconfig = {  "USE_HEADERMAP" => "NO",
                                  "CLANG_CXX_LANGUAGE_STANDARD" => "c++11",
                                }
end
