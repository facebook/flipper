# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
compiler_flags = '-DFB_SONARKIT_ENABLED=1'

Pod::Spec.new do |s|
  s.name         = "react-native-flipper"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  react-native-flipper
                   DESC
  s.homepage     = "https://fbflipper.com/"
  s.license      = "MIT"
  s.license    = { :type => "MIT", :file => "LICENSE" }
  s.authors      = { "Michel Weststrate" => "mweststrate@fb.com" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/facebook/flipper.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,swift}"
  s.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"${PODS_ROOT}/Headers/Public/FlipperKit\"" }
  s.requires_arc = true
  s.compiler_flags = compiler_flags
  s.dependency "React"
end
