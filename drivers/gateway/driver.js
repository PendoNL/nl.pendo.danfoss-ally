'use strict';

const Homey = require('homey');

class GatewayDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Gateway driver has been initialized');
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

        // Danfoss Ally Gateway:
        // - isThermostat: false
        // - has boiler_relay or heat_supply_request
        // - model/name contains "gateway"
        const modelLower = deviceData.model?.toLowerCase() || '';
        const nameLower = deviceData.name?.toLowerCase() || '';
        const isGateway = modelLower.includes('gateway') || nameLower.includes('gateway');
        const hasGatewayCapabilities = 'boiler_relay' in deviceData || 'heat_supply_request' in deviceData;

        if (!deviceData.isThermostat && (isGateway || hasGatewayCapabilities)) {
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

      this.log(`Returning ${devices.length} Gateway devices`);
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

module.exports = GatewayDriver;
