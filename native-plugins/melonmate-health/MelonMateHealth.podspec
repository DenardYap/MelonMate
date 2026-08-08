Pod::Spec.new do |s|
  s.name = 'MelonMateHealth'
  s.version = '1.0.0'
  s.summary = 'Read-only HealthKit activity bridge for MelonMate.'
  s.license = { :type => 'MIT' }
  s.homepage = 'https://melonmate.app'
  s.author = { 'MelonMate' => 'support@melonmate.app' }
  s.source = { :git => 'https://example.invalid/melonmate-health.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/MelonMateHealthPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.swift_version = '5.9'
  s.dependency 'Capacitor'
end
