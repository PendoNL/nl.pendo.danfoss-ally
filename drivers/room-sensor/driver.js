'use strict';

const Homey = require('homey');

class RoomSensorDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Room Sensor driver has been initialized');
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
        // Room sensors have humidity and temperature but are NOT thermostats
        // They lack thermostat properties like temp_set, mode, manual_mode_fast
        const hasHumidity = 'humidity_value' in deviceData || 'humidity' in deviceData;
        const hasTemp = 'temp_current' in deviceData || 'temperature' in deviceData;
        const isNotThermostat = !deviceData.isThermostat;
        const isNotGateway = !deviceData.name?.toLowerCase().includes('gateway');
        const isNotIcon = !deviceData.name?.toLowerCase().includes('icon');

        const isRoomSensor = hasHumidity && hasTemp && isNotThermostat && isNotGateway && isNotIcon;

        if (isRoomSensor) {
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

      this.log(`Returning ${devices.length} room sensor devices`);
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

module.exports = RoomSensorDriver;
