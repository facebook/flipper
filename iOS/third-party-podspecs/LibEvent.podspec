Pod::Spec.new do |s|

  s.name                  = "libevent"
  s.version               = "1.0"
  s.summary               = "Unofficial libevent mirror for Cocoapods"

  s.description           = <<-DESC
                             This is a binary distribution of the libevent library built for iOS.
                             The library uses configure which makes it a bit tricky to cross compile.
                             DESC

  s.homepage              = "http://libevent.org/"
  s.license               = "BSD"
  s.authors               = { "liguangming" => "cute@liguangming.com" }
  s.social_media_url      = "http://twitter.com/liguangming"
  s.ios.deployment_target = "6.0"
  s.source                = { :git => "https://github.com/cute/libevent.git", :tag => "1.0" }
  s.header_dir            = "event2"
  s.source_files          = "include/**/*.h"
  s.ios.library           = "event"
  s.preserve_paths        = "include", "lib"
  s.requires_arc          = false
  s.xcconfig              = {
                                "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/libevent/include",
                                "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/libevent/include/event2",
                                "LIBRARY_SEARCH_PATHS" => "$(PODS_ROOT)/libevent/lib",
                            }

end
