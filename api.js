'use strict';

module.exports = {
  async test({ homey }) {
    try {
      const app = homey.app;

      if (!app.isAuthorized()) {
        // Try to initialize if we have credentials
        const apiKey = homey.settings.get('api_key');
        const apiSecret = homey.settings.get('api_secret');

        if (!apiKey || !apiSecret) {
          return {
            success: false,
            error: 'No API credentials configured',
          };
        }

        await app.initializeApi(apiKey, apiSecret);
      }

      const devices = app.getAllDevices();
      return {
        success: true,
        deviceCount: Object.keys(devices).length,
        devices,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },
};
