'use strict';

const Homey = require('homey');

// Mode mapping: Danfoss mode -> setpoint code
const MODE_SETPOINT_MAP = {
  at_home: 'at_home_setting',
  leaving_home: 'leaving_home_setting',
  manual: 'manual_mode_fast',
  pause: 'pause_setting',
  holiday: 'holiday_setting',
  holiday_sat: 'at_home_setting',
};

class IconThermostatDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Icon Thermostat device has been initialized');

    // Get device ID from data
    this._deviceId = this.getData().id;
    this._fallbackToTempSet = false;

    // Register capability listeners
    this.registerCapabilityListener('target_temperature', async (value) => {
      await this._setTargetTemperature(value);
    });

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
  async _updateCapabilities(deviceData) {
    // Check if device is online
    if (deviceData.online === false) {
      this.setUnavailable('Device is offline').catch(this.error);
      return;
    }

    this.setAvailable().catch(this.error);

    // Determine if we need to use fallback temp_set
    this._fallbackToTempSet = !(
      'manual_mode_fast' in deviceData
      && 'at_home_setting' in deviceData
      && 'leaving_home_setting' in deviceData
      && 'pause_setting' in deviceData
    ) && 'temp_set' in deviceData;

    // Update measure_temperature (current room temperature)
    if ('temperature' in deviceData) {
      this.setCapabilityValue('measure_temperature', deviceData.temperature).catch(this.error);
    } else if ('temp_current' in deviceData) {
      this.setCapabilityValue('measure_temperature', deviceData.temp_current / 10).catch(this.error);
    }

    // Update floor temperature if available
    if ('floor_temperature' in deviceData && this.hasCapability('measure_temperature.floor')) {
      this.setCapabilityValue('measure_temperature.floor', deviceData.floor_temperature).catch(this.error);
    }

    // Update target_temperature
    const targetTemp = this._getSetpointForCurrentMode(deviceData);
    if (targetTemp !== null) {
      // All Ally API setpoint codes are reported in tenths of a degree
      const temp = targetTemp / 10;
      this.setCapabilityValue('target_temperature', temp).catch(this.error);
    }

    // Update measure_humidity if available
    if ('humidity' in deviceData) {
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(this.error);
      }
      this.setCapabilityValue('measure_humidity', deviceData.humidity).catch(this.error);
    } else if ('humidity_value' in deviceData) {
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(this.error);
      }
      const humidity = deviceData.humidity_value / 10;
      this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
    }

    // Update battery if available
    if ('battery' in deviceData) {
      this.setCapabilityValue('measure_battery', deviceData.battery).catch(this.error);
    } else if ('battery_percentage' in deviceData) {
      this.setCapabilityValue('measure_battery', deviceData.battery_percentage).catch(this.error);
    }

    this.log(`Updated Icon Thermostat ${this._deviceId}: temp=${deviceData.temperature}, floor_temp=${deviceData.floor_temperature}, target=${targetTemp} [mode=${deviceData.mode}, temp_set=${deviceData.temp_set}, manual_mode_fast=${deviceData.manual_mode_fast}, at_home_setting=${deviceData.at_home_setting}, holiday_setting=${deviceData.holiday_setting}]`);
  }

  /**
   * Get the active setpoint.
   *
   * On Icon systems `mode` is the Ally gateway's house mode, not the Icon
   * room's own control mode: a room left in permanent manual mode on the Icon
   * controller is still reported as at_home. The per-mode setpoint codes are
   * therefore the presets configured in the Ally app, and manual_mode_fast is
   * rewritten to upper_temp (35) while the room calls for heat. Only temp_set
   * carries the room's active setpoint, so prefer it whenever it is reported.
   */
  _getSetpointForCurrentMode(deviceData) {
    if ('temp_set' in deviceData) {
      return deviceData.temp_set;
    }

    // Icon rooms that do not report temp_set: fall back to the mode preset.
    const setpointCode = 'mode' in deviceData
      ? this._getSetpointCode(deviceData.mode)
      : 'manual_mode_fast';

    if (setpointCode in deviceData) {
      return deviceData[setpointCode];
    }

    if ('manual_mode_fast' in deviceData) {
      return deviceData.manual_mode_fast;
    }

    return null;
  }

  /**
   * Get the setpoint code for a mode
   */
  _getSetpointCode(mode) {
    return MODE_SETPOINT_MAP[mode] || 'manual_mode_fast';
  }

  /**
   * Set target temperature
   */
  async _setTargetTemperature(temperature) {
    const app = this.homey.app;
    const deviceData = app.getDeviceData(this._deviceId);

    let setpointCode = 'manual_mode_fast';

    if (this._fallbackToTempSet) {
      setpointCode = 'temp_set';
    } else if (deviceData && 'mode' in deviceData) {
      setpointCode = this._getSetpointCode(deviceData.mode);
    }

    // Icon devices may need temperature in tenths or direct value - try tenths first
    const tempInTenths = Math.round(temperature * 10);

    try {
      await app.setTemperature(this._deviceId, tempInTenths, setpointCode);
      this.log(`Set temperature to ${temperature}°C (${tempInTenths} tenths, ${setpointCode})`);
    } catch (err) {
      this.error('Failed to set temperature:', err.message);
      throw err;
    }
  }

  /**
   * Called when device is added
   */
  async onAdded() {
    this.log('Icon Thermostat device has been added');
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
    this.log('Icon Thermostat device has been deleted');
  }

}

module.exports = IconThermostatDevice;
