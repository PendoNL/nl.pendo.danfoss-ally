'use strict';

const Homey = require('homey');

class IconControllerDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Icon Controller driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   */
  async onPairListDevices() {
    this.log('onPairListDevices called');

    try {
      const app = this.homey.app;

      if (!app.isAuthorized()) {
        this.log('Not authorized');
        return [];
      }

      // Ensure devices are fetched
      await app.pollDevices();

      const allDevices = app.getAllDevices() || {};
      const devices = [];

      for (const [deviceId, deviceData] of Object.entries(allDevices)) {
        this.log(`Checking device ${deviceId}:`, deviceData.name, 'model:', deviceData.model, 'isThermostat:', deviceData.isThermostat);

        // Icon Controller / Zigbee Module: model is "Icon Zigbee Module" or similar
        // It is NOT a thermostat (isThermostat: false)
        const modelLower = deviceData.model?.toLowerCase() || '';
        const isIconController = modelLower === 'icon zigbee module'
          || modelLower.includes('icon') && modelLower.includes('module')
          || modelLower.includes('icon') && modelLower.includes('controller');

        if (isIconController && !deviceData.isThermostat) {
          devices.push({
            name: deviceData.name,
            data: {
              id: deviceId,
            },
            store: {
              model: deviceData.model,
            },
          });
        }
      }

      this.log(`Returning ${devices.length} Icon Controller devices`);
      return devices;
    } catch (err) {
      this.error('Error in onPairListDevices:', err.message);
      return [];
    }
  }

  /**
   * onPair is called when pairing is initiated
   */
  async onPair(session) {
    // Handle list_devices - must be explicitly registered when using onPair
    session.setHandler('list_devices', async () => {
      this.log('list_devices handler called');
      return this.onPairListDevices();
    });
  }

}

module.exports = IconControllerDriver;
