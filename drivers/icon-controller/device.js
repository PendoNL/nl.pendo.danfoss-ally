'use strict';

const Homey = require('homey');

class IconControllerDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Icon Controller device has been initialized');

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

    this.log(`Updated Icon Controller ${this._deviceId}: online=${deviceData.online}`);
  }

  /**
   * Called when device is added
   */
  async onAdded() {
    this.log('Icon Controller device has been added');
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
    this.log('Icon Controller device has been deleted');
  }

}

module.exports = IconControllerDevice;
