module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // EAS cloud builds: GOOGLE_SERVICES_JSON is set to the path of the file secret.
    // EAS local builds: pass the absolute path inline:
    //   GOOGLE_SERVICES_JSON="/abs/path/google-services.json" eas build --local
    // Local dev (expo run:android): falls back to the gitignored ./google-services.json.
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
