module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds react-native-worklets/plugin itself whenever the
    // package is installed, which Reanimated 4 depends on. Listing it here as
    // well applies the transform twice — the old `react-native-reanimated/plugin`
    // entry is now just a re-export of that same worklets plugin.
    presets: ["babel-preset-expo"],
  };
};
