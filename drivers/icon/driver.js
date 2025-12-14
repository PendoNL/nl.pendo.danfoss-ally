'use strict';

const Homey = require('homey');

class IconDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Icon driver has been initialized');
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
        // Icon Controller: name contains "Icon" (e.g., "Danfoss Icon2 Controller")
        // The Icon Controller is NOT a thermostat itself (isThermostat: false)
        const nameContainsIcon = deviceData.name?.toLowerCase().includes('icon');

        if (nameContainsIcon) {
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

      this.log(`Returning ${devices.length} Icon devices`);
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

module.exports = IconDriver;
