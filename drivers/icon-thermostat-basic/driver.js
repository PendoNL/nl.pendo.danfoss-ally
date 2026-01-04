'use strict';

const Homey = require('homey');

class IconThermostatBasicDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Icon Thermostat Basic driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   */
  async onPairListDevices() {
    this.log('onPairListDevices called');

    try {
      const app = this.homey.app;

      this.log('Checking authorization...');
      if (!app.isAuthorized()) {
        this.log('Not authorized, throwing error');
        throw new Error('Not authorized. Please login first.');
      }

      this.log('Authorized, polling devices...');
      await app.pollDevices();

      this.log('Getting all devices...');
      const allDevices = app.getAllDevices();

      if (!allDevices || typeof allDevices !== 'object') {
        this.log('allDevices is null or not an object, returning empty array');
        return [];
      }

      const devices = [];

      for (const [deviceId, deviceData] of Object.entries(allDevices)) {
        this.log(`Checking device ${deviceId}:`, deviceData.name, 'isThermostat:', deviceData.isThermostat, 'model:', deviceData.model, 'has floor_temperature:', 'floor_temperature' in deviceData);

        // Icon Thermostat Basic without floor sensor (088U2121):
        // - isThermostat: true
        // - model contains "Icon"
        // - does NOT have floor_temperature capability
        const modelContainsIcon = deviceData.model?.toLowerCase().includes('icon');
        const hasFloorTemperature = 'floor_temperature' in deviceData;

        if (deviceData.isThermostat && modelContainsIcon && !hasFloorTemperature) {
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

      this.log(`Returning ${devices.length} Icon Thermostat Basic (without floor sensor) devices`);
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
    session.setHandler('list_devices', async () => {
      this.log('list_devices handler called');
      return this.onPairListDevices();
    });
  }

}

module.exports = IconThermostatBasicDriver;
