const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix React Native component registration issues
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native$': 'react-native-web'
};

config.resolver.platforms = [
  'web',
  'native',
  'ios',
  'android'
];

module.exports = config; 

config.resolver.unstable_enablePackageExports = false;