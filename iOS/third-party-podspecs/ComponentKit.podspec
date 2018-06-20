Pod::Spec.new do |s|
  s.name = 'ComponentKit'
  s.version = '0.22'
  s.license = 'BSD'
  s.summary = 'A React-inspired view framework for iOS'
  s.homepage = 'https://componentkit.org'
  s.social_media_url = 'https://twitter.com/componentkit'
  s.authors = 'adamjernst@fb.com'
  s.source = { :git => 'https://github.com/facebook/ComponentKit.git' }
  s.ios.deployment_target = '8.1'
  s.requires_arc = true

  s.source_files = 'ComponentKit/**/*', 'ComponentTextKit/**/*'
  s.frameworks = 'UIKit', 'CoreText'
  s.library = 'c++'
  s.xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++14',
    'CLANG_CXX_LIBRARY' => 'libc++',
  }
  s.dependency 'Yoga', '~> 1.6'
end
