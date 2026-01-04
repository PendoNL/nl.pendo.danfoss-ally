'use strict';

const Homey = require('homey');

class IconRoomSensorDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Icon Room Sensor driver has been initialized');
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
        this.log(`Checking device ${deviceId}:`, deviceData.name, 'isThermostat:', deviceData.isThermostat, 'model:', deviceData.model);

        // Icon Room Sensor (088U2120):
        // - isThermostat: false (it's a sensor, not a thermostat)
        // - model contains "Icon"
        // - has temperature and/or humidity
        // - is NOT the Icon Controller/Zigbee Module
        const modelLower = deviceData.model?.toLowerCase() || '';
        const modelContainsIcon = modelLower.includes('icon');
        const isController = modelLower.includes('module') || modelLower.includes('controller');
        const hasTemp = 'temperature' in deviceData || 'temp_current' in deviceData;
        const hasHumidity = 'humidity' in deviceData || 'humidity_value' in deviceData;

        if (!deviceData.isThermostat && modelContainsIcon && !isController && (hasTemp || hasHumidity)) {
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

      this.log(`Returning ${devices.length} Icon Room Sensor devices`);
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

module.exports = IconRoomSensorDriver;
