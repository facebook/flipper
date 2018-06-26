Pod::Spec.new do |spec|
    spec.name     = 'PeerTalk'
    spec.version  = '0.0.2'
    spec.license  = { :type => 'MIT' }
    spec.homepage = 'http://rsms.me/peertalk/'
    spec.authors  = { 'Rasmus Andersson' => 'rasmus@notion.se' }
    spec.summary  = 'iOS and OS X Cocoa library for communicating over USB and TCP.'

    spec.source   = { :git => "https://github.com/rsms/peertalk.git" }
    spec.source_files = 'peertalk/*.{h,m}'
    spec.requires_arc = true
    spec.ios.deployment_target = '8.4'
    spec.osx.deployment_target = '10.10'

   spec.description = "                    PeerTalk is a iOS and OS X Cocoa library for communicating over USB and TCP.\n\n                    Highlights:\n\n                    * Provides you with USB device attach/detach events and attached device's info\n                    * Can connect to TCP services on supported attached devices (e.g. an iPhone), bridging the communication over USB transport\n                    * Offers a higher-level API (PTChannel and PTProtocol) for convenient implementations.\n                    * Tested and designed for libdispatch (aka Grand Central Dispatch).\n"
end
