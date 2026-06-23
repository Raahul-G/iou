// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expo } = require("./app.json");

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      // In EAS builds the GOOGLE_SERVICES_JSON env var is set to the path
      // where the file secret is placed. Locally it falls back to the
      // gitignored ./google-services.json file.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile,
    },
  },
};
