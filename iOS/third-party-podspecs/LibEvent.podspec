# This podspec is not being used instead the hard coded path to local LibEvent is used.
# TODO use this spec instead of hard coded path `/usr/local/include`
Pod::Spec.new do |spec|
  spec.name = 'LibEvent'
  spec.version = '2.1.8'
  spec.license = { :file => 'LICENSE'}
  spec.homepage = 'https://github.com/rsocket/rsocket-cpp'
  spec.summary = 'LibEvent'
  spec.authors = 'LibEvent'
  spec.source = { :git => 'https://github.com/libevent/libevent.git', :tag => "release-2.1.8-stable"}
  spec.module_name = 'LibEvent'
  spec.source_files = '**/*.h'
  spec.platforms = { :ios => "8.0", :tvos => "9.2" }
end
