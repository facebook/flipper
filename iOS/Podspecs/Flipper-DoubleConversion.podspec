# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
  spec.name = 'Flipper-DoubleConversion'
  spec.version = '1.1.7'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/google/double-conversion'
  spec.summary = 'Efficient binary-decimal and decimal-binary conversion routines for IEEE doubles'
  spec.authors = 'Google'
  spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/google/double-conversion.git',
                  :tag => "v1.1.6" }
  spec.module_name = 'DoubleConversion'
  spec.header_dir = 'double-conversion'
  spec.source_files = 'double-conversion/*.{h,cc}'
  spec.compiler_flags = '-Wno-unreachable-code'
  spec.platforms = { :ios => "8.0", :tvos => "8.0" }
  spec.pod_target_xcconfig = { 'ONLY_ACTIVE_ARCH' => 'YES' }

end
