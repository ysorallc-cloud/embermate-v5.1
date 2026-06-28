module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // SDK 54 / reanimated 4 — the worklets babel plugin moved out of
      // react-native-reanimated into the standalone react-native-worklets
      // package. Must remain the LAST plugin in the list.
      'react-native-worklets/plugin',
    ],
  };
};
