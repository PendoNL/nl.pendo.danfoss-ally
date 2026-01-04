'use strict';

const Homey = require('homey');

class IconRoomSensorDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Icon Room Sensor device has been initialized');

    // Get device ID from data
    this._deviceId = this.getData().id;

    // Listen for updates from the app
    this.homey.on('danfoss_ally_update', (devices) => {
      this._onDeviceUpdate(devices);
    });

    // Initial sync
    this._syncFromApi();
  }

  /**
   * Called when device data is updated from API
   */
  _onDeviceUpdate(devices) {
    const deviceData = devices[this._deviceId];
    if (deviceData) {
      this._updateCapabilities(deviceData);
    }
  }

  /**
   * Sync device state from API
   */
  _syncFromApi() {
    const app = this.homey.app;
    const deviceData = app.getDeviceData(this._deviceId);

    if (deviceData) {
      this._updateCapabilities(deviceData);
    }
  }

  /**
   * Update capabilities from device data
   */
  _updateCapabilities(deviceData) {
    // Check if device is online
    if (deviceData.online === false) {
      this.setUnavailable('Device is offline').catch(this.error);
      return;
    }

    this.setAvailable().catch(this.error);

    // Update measure_temperature
    if ('temperature' in deviceData) {
      this.setCapabilityValue('measure_temperature', deviceData.temperature).catch(this.error);
    } else if ('temp_current' in deviceData) {
      this.setCapabilityValue('measure_temperature', deviceData.temp_current / 10).catch(this.error);
    }

    // Update measure_humidity
    if (this.hasCapability('measure_humidity')) {
      if ('humidity' in deviceData) {
        this.setCapabilityValue('measure_humidity', deviceData.humidity).catch(this.error);
      } else if ('humidity_value' in deviceData) {
        this.setCapabilityValue('measure_humidity', deviceData.humidity_value).catch(this.error);
      }
    }

    // Update battery if available
    if (this.hasCapability('measure_battery')) {
      if ('battery' in deviceData) {
        this.setCapabilityValue('measure_battery', deviceData.battery).catch(this.error);
      } else if ('battery_percentage' in deviceData) {
        this.setCapabilityValue('measure_battery', deviceData.battery_percentage).catch(this.error);
      }
    }

    this.log(`Updated Icon Room Sensor ${this._deviceId}: temp=${deviceData.temperature || deviceData.temp_current}, humidity=${deviceData.humidity || deviceData.humidity_value}`);
  }

  /**
   * Called when device is added
   */
  async onAdded() {
    this.log('Icon Room Sensor device has been added');
  }

  /**
   * Called when device settings are changed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
  }

  /**
   * Called when device is renamed
   */
  async onRenamed(name) {
    this.log('Device was renamed to:', name);
  }

  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('Icon Room Sensor device has been deleted');
  }

}

module.exports = IconRoomSensorDevice;
