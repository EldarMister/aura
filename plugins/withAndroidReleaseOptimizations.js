const { withAppBuildGradle } = require('@expo/config-plugins');

const ABI_FILTERS = 'ndk { abiFilters "armeabi-v7a", "arm64-v8a" }';

module.exports = function withAndroidReleaseOptimizations(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(ABI_FILTERS)) return config;

    config.modResults.contents = contents.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n        ${ABI_FILTERS}`,
    );

    return config;
  });
};
