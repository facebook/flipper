# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
    spec.name     = 'Flipper-PeerTalk'
    spec.version  = '0.0.4'
    spec.license  = { :type => 'MIT' }
    spec.homepage = 'http://rsms.me/peertalk/'
    spec.authors  = { 'Rasmus Andersson' => 'rasmus@notion.se' }
    spec.summary  = 'iOS and OS X Cocoa library for communicating over USB and TCP.'

    spec.source   = { :git => "https://github.com/priteshrnandgaonkar/peertalk.git",
                      :tag => "v0.0.3" }
    spec.source_files = 'peertalk/*.{h,m}'
    spec.requires_arc = true
    spec.ios.deployment_target = '8.4'
    spec.osx.deployment_target = '10.10'
    spec.header_mappings_dir = 'peertalk'
    spec.header_dir = 'peertalk'
   spec.description = "                    PeerTalk is a iOS and OS X Cocoa library for communicating over USB and TCP.\n\n                    Highlights:\n\n                    * Provides you with USB device attach/detach events and attached device's info\n                    * Can connect to TCP services on supported attached devices (e.g. an iPhone), bridging the communication over USB transport\n                    * Offers a higher-level API (PTChannel and PTProtocol) for convenient implementations.\n                    * Tested and designed for libdispatch (aka Grand Central Dispatch).\n"
    spec.pod_target_xcconfig = { 'ONLY_ACTIVE_ARCH' => 'YES' }
end
