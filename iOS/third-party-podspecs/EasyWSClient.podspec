Pod::Spec.new do |spec|
  spec.name = 'EasyWSClient'
  spec.version = '1.0.0'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/google/double-conversion'
  spec.summary = 'Easywsclient is an easy and powerful WebSocket client to get your C++ code connected to a web stack right away.'
  spec.authors = 'David Baird'
  # spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/dhbaird/easywsclient.git', :branch => 'master'}
  spec.module_name = 'EasyWSClient'
  spec.source_files = '*.{hpp,cpp}'
  spec.libraries = "stdc++"
  spec.compiler_flags = '-std=c++1y'
  # Pinning to the same version as React.podspec.
  spec.platforms = { :ios => "8.0"}

end
