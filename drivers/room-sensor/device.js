'use strict';

const Homey = require('homey');

class RoomSensorDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Room Sensor device has been initialized');

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

    // Update measure_temperature (temp_current is in tenths of degrees)
    if ('temp_current' in deviceData) {
      const temp = deviceData.temp_current / 10;
      this.setCapabilityValue('measure_temperature', temp)
        .then(() => this.log('Set temperature:', temp))
        .catch((err) => this.error('Failed to set temperature:', err.message));
    }

    // Update measure_humidity (humidity_value is in tenths of percent)
    if ('humidity_value' in deviceData) {
      const humidity = deviceData.humidity_value / 10;
      this.setCapabilityValue('measure_humidity', humidity)
        .then(() => this.log('Set humidity:', humidity))
        .catch((err) => this.error('Failed to set humidity:', err.message));
    }

    // Update measure_battery
    if ('battery_percentage' in deviceData) {
      this.setCapabilityValue('measure_battery', deviceData.battery_percentage)
        .then(() => this.log('Set battery:', deviceData.battery_percentage))
        .catch((err) => this.error('Failed to set battery:', err.message));
    }

    this.log(`Updated room sensor ${this._deviceId}: temp=${deviceData.temp_current / 10}°C, humidity=${deviceData.humidity_value / 10}%, battery=${deviceData.battery_percentage}%`);
  }

  /**
   * Called when device is added
   */
  async onAdded() {
    this.log('Room Sensor device has been added');
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
    this.log('Room Sensor device has been deleted');
  }

}

module.exports = RoomSensorDevice;
