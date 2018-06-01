Pod::Spec.new do |spec|
  spec.name = 'DoubleConversion'
  spec.version = '3.0.0'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/google/double-conversion'
  spec.summary = 'Efficient binary-decimal and decimal-binary conversion routines for IEEE doubles'
  spec.authors = 'Google'
  # spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/google/double-conversion.git',
                  :tag => "v#{spec.version}" }
  spec.module_name = 'DoubleConversion'
  spec.source_files = 'double-conversion/*.{h,cc}'
  spec.libraries = "stdc++"
  spec.compiler_flags = '-std=c++1y'
  # Pinning to the same version as React.podspec.
  spec.platforms = { :ios => "8.0" }

end
