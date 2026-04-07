'use strict';

const BASE_URL = 'https://api.danfoss.com';
const TOKEN_ENDPOINT = '/oauth2/token';
const DEVICES_ENDPOINT = '/ally/devices';
const DEFAULT_RETRY_AFTER = 60;

/**
 * Danfoss Ally API client
 * Ported from pydanfossally Python library
 */
class DanfossAllyApi {

  constructor() {
    this._key = null;
    this._secret = null;
    this._token = null;
    this._tokenExpires = null;
    this._authorized = false;
    this._devices = {};
  }

  /**
   * Initialize and authorize with the Danfoss Ally API
   * @param {string} key - API key from developer.danfoss.com
   * @param {string} secret - API secret from developer.danfoss.com
   * @returns {Promise<boolean>} - Authorization success
   */
  async initialize(key, secret) {
    this._key = key;
    this._secret = secret;

    try {
      await this._getToken();
      this._authorized = true;
      return true;
    } catch (err) {
      this._authorized = false;
      throw err;
    }
  }

  /**
   * Get OAuth2 access token using client credentials flow
   */
  async _getToken() {
    const credentials = Buffer.from(`${this._key}:${this._secret}`).toString('base64');

    const response = await fetch(`${BASE_URL}${TOKEN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    this._token = data.access_token;
    // Set expiration 30 seconds before actual expiry for safety margin
    this._tokenExpires = Date.now() + (data.expires_in - 30) * 1000;

    return this._token;
  }

  /**
   * Ensure we have a valid token, refresh if needed
   */
  async _ensureToken() {
    if (!this._token || Date.now() >= this._tokenExpires) {
      await this._getToken();
    }
  }

  /**
   * Make an authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} body - Request body (optional)
   * @returns {Promise<object>} - Response data
   */
  async _request(endpoint, method = 'GET', body = null) {
    await this._ensureToken();

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this._token}`,
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      // Token expired, try to refresh once
      await this._getToken();
      options.headers['Authorization'] = `Bearer ${this._token}`;
      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, options);
      if (!retryResponse.ok) {
        throw new Error(`API request failed: ${retryResponse.status}`);
      }
      return retryResponse.json();
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After'), 10) || DEFAULT_RETRY_AFTER;
      const err = new Error(`Rate limited by Danfoss API, retry after ${retryAfter}s`);
      err.code = 'RATE_LIMITED';
      err.retryAfter = retryAfter;
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get list of all devices and process their data
   * @returns {Promise<object>} - Devices object keyed by device ID
   */
  async getDeviceList() {
    const data = await this._request(DEVICES_ENDPOINT);

    if (data && data.result) {
      this._devices = {};
      for (const device of data.result) {
        this._handleDeviceData(device);
      }
    }

    return this._devices;
  }

  /**
   * Process device data and extract relevant properties
   * @param {object} device - Raw device data from API
   */
  _handleDeviceData(device) {
    const deviceId = device.id;
    const deviceData = {
      id: deviceId,
      name: device.name || 'Unknown Device',
      model: device.model || device.device_type || 'Unknown',
      online: device.online || false,
      isThermostat: false,
    };

    // Process status array into key-value pairs
    if (device.status && Array.isArray(device.status)) {
      for (const status of device.status) {
        const code = status.code;
        let value = status.value;

        // Convert boolean strings
        if (value === 'true') value = true;
        if (value === 'false') value = false;

        deviceData[code] = value;
      }
    }

    // Determine if device is a thermostat
    deviceData.isThermostat = this._isThermostat(deviceData);

    this._devices[deviceId] = deviceData;
  }

  /**
   * Check if device is a thermostat based on its capabilities
   * Based on pydanfossally: device is thermostat if it has setpoint codes
   * @param {object} deviceData - Processed device data
   * @returns {boolean}
   */
  _isThermostat(deviceData) {
    // Device is a thermostat if it has ANY temperature setpoint control
    // This matches pydanfossally's detection logic exactly
    return (
      'manual_mode_fast' in deviceData ||
      'at_home_setting' in deviceData ||
      'leaving_home_setting' in deviceData ||
      'pause_setting' in deviceData ||
      'holiday_setting' in deviceData ||
      'temp_set' in deviceData
    );
  }

  /**
   * Get a specific device
   * @param {string} deviceId - Device ID
   * @returns {Promise<object>} - Device data
   */
  async getDevice(deviceId) {
    const data = await this._request(`${DEVICES_ENDPOINT}/${deviceId}`);
    if (data && data.result) {
      this._handleDeviceData(data.result);
      return this._devices[deviceId];
    }
    return null;
  }

  /**
   * Set temperature for a device
   * @param {string} deviceId - Device ID
   * @param {number} temperature - Target temperature
   * @param {string} code - Temperature code (e.g., 'manual_mode_fast', 'at_home_setting')
   * @returns {Promise<boolean>} - Success
   */
  async setTemperature(deviceId, temperature, code = 'manual_mode_fast') {
    const commands = [{ code, value: temperature }];
    return this.sendCommand(deviceId, commands);
  }

  /**
   * Set operating mode for a device
   * @param {string} deviceId - Device ID
   * @param {string} mode - Mode (e.g., 'at_home', 'leaving_home', 'manual', 'pause')
   * @returns {Promise<boolean>} - Success
   */
  async setMode(deviceId, mode) {
    const commands = [{ code: 'mode', value: mode }];
    return this.sendCommand(deviceId, commands);
  }

  /**
   * Send commands to a device
   * @param {string} deviceId - Device ID
   * @param {Array} commands - Array of {code, value} objects
   * @returns {Promise<boolean>} - Success
   */
  async sendCommand(deviceId, commands) {
    const body = { commands };
    const data = await this._request(`${DEVICES_ENDPOINT}/${deviceId}/commands`, 'POST', body);
    return data && data.result === true;
  }

  /**
   * Get all cached devices
   * @returns {object} - Devices object
   */
  get devices() {
    return this._devices;
  }

  /**
   * Check if authorized
   * @returns {boolean}
   */
  get authorized() {
    return this._authorized;
  }

}

module.exports = DanfossAllyApi;
