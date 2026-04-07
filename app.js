'use strict';

const Homey = require('homey');
const DanfossAllyApi = require('./lib/DanfossAllyApi');

const DEFAULT_POLL_INTERVAL = 45; // seconds
const MIN_POLL_INTERVAL = 10; // seconds
const MAX_POLL_INTERVAL = 300; // seconds

class DanfossAllyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Danfoss Ally app has been initialized');

    this.api = new DanfossAllyApi();
    this._pollInterval = null;
    this._lastWriteTime = 0;
    this._lastPollTime = 0;

    // Try to initialize with stored credentials
    const apiKey = this.homey.settings.get('api_key');
    const apiSecret = this.homey.settings.get('api_secret');

    if (apiKey && apiSecret) {
      try {
        await this.initializeApi(apiKey, apiSecret);
      } catch (err) {
        this.error('Failed to initialize API with stored credentials:', err.message);
      }
    }

    // Listen for settings changes
    this.homey.settings.on('set', async (key) => {
      if (key === 'api_key' || key === 'api_secret') {
        const newKey = this.homey.settings.get('api_key');
        const newSecret = this.homey.settings.get('api_secret');
        if (newKey && newSecret) {
          try {
            await this.initializeApi(newKey, newSecret);
          } catch (err) {
            this.error('Failed to initialize API after settings change:', err.message);
          }
        }
      } else if (key === 'poll_interval') {
        this._startPolling();
      }
    });

    // Register flow cards
    this._registerFlowCards();
  }

  /**
   * Register flow card handlers
   */
  _registerFlowCards() {
    // Condition: Temperature is above
    const conditionTemperatureAbove = this.homey.flow.getConditionCard('temperature_above');
    conditionTemperatureAbove.registerRunListener(async (args) => {
      const currentTemp = args.device.getCapabilityValue('measure_temperature');
      return currentTemp > args.temperature;
    });

    // Action: Set temperature
    const actionSetTemperature = this.homey.flow.getActionCard('set_temperature');
    actionSetTemperature.registerRunListener(async (args) => {
      // Trigger the capability listener which handles API communication
      await args.device.triggerCapabilityListener('target_temperature', args.temperature);
    });

    // Action: Set mode
    const actionSetMode = this.homey.flow.getActionCard('set_mode');
    actionSetMode.registerRunListener(async (args) => {
      const deviceId = args.device.getData().id;
      await this.setMode(deviceId, args.mode);
    });

    // Action: Set mode for all thermostats
    const actionSetModeAll = this.homey.flow.getActionCard('set_mode_all');
    actionSetModeAll.registerRunListener(async (args) => {
      const devices = this.getAllDevices();
      const results = [];
      for (const [deviceId, deviceData] of Object.entries(devices)) {
        if (deviceData.isThermostat) {
          results.push(this.setMode(deviceId, args.mode));
        }
      }
      await Promise.all(results);
    });

    this.log('Flow cards registered');
  }

  /**
   * Initialize the API client with credentials
   * @param {string} key - API key
   * @param {string} secret - API secret
   */
  async initializeApi(key, secret) {
    this.log('Initializing Danfoss Ally API...');

    await this.api.initialize(key, secret);

    if (this.api.authorized) {
      this.log('API authorized successfully');

      // Fetch initial device list
      await this.pollDevices();

      // Start polling
      this._startPolling();
    } else {
      throw new Error('API authorization failed');
    }
  }

  /**
   * Get the configured poll interval in milliseconds
   * @returns {number}
   */
  _getPollInterval() {
    const setting = this.homey.settings.get('poll_interval');
    const seconds = Math.min(MAX_POLL_INTERVAL, Math.max(MIN_POLL_INTERVAL, setting || DEFAULT_POLL_INTERVAL));
    return seconds * 1000;
  }

  /**
   * Start the polling interval
   */
  _startPolling() {
    // Clear existing interval if any
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
    }

    const interval = this._getPollInterval();

    this._pollInterval = this.homey.setInterval(async () => {
      await this.pollDevices();
    }, interval);

    this.log(`Started polling every ${interval / 1000} seconds`);
  }

  /**
   * Stop the polling interval
   */
  _stopPolling() {
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
      this._pollInterval = null;
      this.log('Stopped polling');
    }
  }

  /**
   * Poll devices from the API
   */
  async pollDevices() {
    // Postpone poll if a recent write was made (avoid UI glitches)
    const timeSinceWrite = Date.now() - this._lastWriteTime;
    if (timeSinceWrite < 1000) {
      this.log('Postponing poll due to recent write');
      await new Promise((resolve) => this.homey.setTimeout(resolve, 1000));
    }

    try {
      const devices = await this.api.getDeviceList();
      this._lastPollTime = Date.now();

      // Emit event for all drivers to update their devices
      this.homey.emit('danfoss_ally_update', devices);

      this.log(`Polled ${Object.keys(devices).length} devices`);
    } catch (err) {
      if (err.code === 'RATE_LIMITED') {
        this.error(`Rate limited by Danfoss API. Consider increasing the poll interval (currently ${this._getPollInterval() / 1000}s). Retry after ${err.retryAfter}s.`);
      } else {
        this.error('Failed to poll devices:', err.message);
      }
    }
  }

  /**
   * Set temperature for a device (called by device instances)
   * @param {string} deviceId - Device ID
   * @param {number} temperature - Target temperature
   * @param {string} code - Temperature setpoint code
   */
  async setTemperature(deviceId, temperature, code = 'manual_mode_fast') {
    this._lastWriteTime = Date.now();

    try {
      const success = await this.api.setTemperature(deviceId, temperature, code);
      if (success) {
        this.log(`Set temperature for ${deviceId} to ${temperature} (${code})`);
      }
      return success;
    } catch (err) {
      this.error(`Failed to set temperature for ${deviceId}:`, err.message);
      throw err;
    }
  }

  /**
   * Set mode for a device (called by device instances)
   * @param {string} deviceId - Device ID
   * @param {string} mode - Operating mode
   */
  async setMode(deviceId, mode) {
    this._lastWriteTime = Date.now();

    try {
      const success = await this.api.setMode(deviceId, mode);
      if (success) {
        this.log(`Set mode for ${deviceId} to ${mode}`);
      }
      return success;
    } catch (err) {
      this.error(`Failed to set mode for ${deviceId}:`, err.message);
      throw err;
    }
  }

  /**
   * Send commands to a device (called by device instances)
   * @param {string} deviceId - Device ID
   * @param {Array} commands - Array of {code, value} objects
   */
  async sendCommands(deviceId, commands) {
    this._lastWriteTime = Date.now();

    try {
      const success = await this.api.sendCommand(deviceId, commands);
      if (success) {
        this.log(`Sent commands to ${deviceId}:`, commands);
      }
      return success;
    } catch (err) {
      this.error(`Failed to send commands to ${deviceId}:`, err.message);
      throw err;
    }
  }

  /**
   * Get cached device data
   * @param {string} deviceId - Device ID
   * @returns {object|null} - Device data or null
   */
  getDeviceData(deviceId) {
    return this.api.devices[deviceId] || null;
  }

  /**
   * Get all cached devices
   * @returns {object} - All devices
   */
  getAllDevices() {
    return this.api.devices;
  }

  /**
   * Check if API is authorized
   * @returns {boolean}
   */
  isAuthorized() {
    return this.api && this.api.authorized;
  }

  /**
   * Called when app is unloaded
   */
  async onUninit() {
    this._stopPolling();
  }

}

module.exports = DanfossAllyApp;
