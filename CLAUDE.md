# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Homey app (SDK v3) for integrating Danfoss Ally smart heating devices via the Danfoss Ally API. The app allows Homey users to control Danfoss Ally thermostats and related climate devices.

## Build Commands

```bash
# Install dependencies
npm install

# Run the app locally on Homey (requires Homey CLI)
homey app run

# Deploy app to Homey
homey app install

# Validate app manifest
homey app validate

# Compose app.json from homeycompose
homey app compose
```

## Architecture

### Homey App SDK v3 Structure

- **app.js** - Main app entry point, extends `Homey.App`
- **drivers/** - Device drivers (currently empty, to be implemented)
- **.homeycompose/** - Composable app configuration
  - **app.json** - App manifest (merged into root app.json)
  - **drivers/** - Driver definitions and templates
  - **flow/** - Flow card definitions (triggers, conditions, actions)
  - **capabilities/** - Custom capability definitions
  - **signals/** - RF signal definitions

### Key Concepts

- The root `app.json` is auto-generated from `.homeycompose/app.json` - edit the compose version
- Drivers are placed in `drivers/<driver-id>/` with `driver.js` and `device.js`
- Flow cards define Homey automation triggers/conditions/actions
- The app requires Homey firmware >=12.4.0

### Danfoss Ally API

The `.ha-danfoss/` directory contains reference code from a Home Assistant integration for the same API. Useful for understanding:
- API authentication flow (API key + secret from developer.danfoss.com)
- Device types and capabilities
- API endpoints and data structures
