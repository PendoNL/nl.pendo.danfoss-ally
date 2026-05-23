# Danfoss Ally for Homey

A Homey app (SDK v3) that bridges the Danfoss Ally cloud API into the Homey smart home platform, turning Danfoss radiator thermostats, room sensors, and Icon floor-heating systems into first-class citizens of any Homey-driven automation.

- **Version:** 1.3.1
- **Category:** Climate
- **Compatibility:** Homey firmware ≥ 12.4.0
- **Repository:** https://github.com/PendoNL/nl.pendo.danfoss-ally

---

## Features

### Top 3 Highlights

1. **Broad device coverage across the Danfoss heating ecosystem**
   Seven dedicated drivers in one app: Ally Thermostat, Ally Room Sensor, Ally Gateway (with boiler-relay heat-demand indicator), Icon Controller, Icon Thermostat + Floor IR (including a separate floor temperature reading), Icon Thermostat Basic, and Icon Room Sensor. One install covers virtually any Danfoss Ally setup.

2. **Smart, configurable cloud polling**
   A single app-level poller fans state out to all devices, with a user-configurable interval (10–300s, default 45s) exposed in the app settings. Polls are automatically deferred for a moment after a write to avoid UI flicker, and rate-limit responses from the Danfoss API are detected and logged with actionable guidance instead of failing silently.

3. **Whole-home mode automation via Flow**
   A dedicated "Set mode for all thermostats" Flow action switches every paired thermostat at once between *At home*, *Leaving home*, *Holiday (Away)*, *Holiday (Home)*, *Pause*, and *Manual* — perfect for one-tap routines tied to presence, calendars, or time-of-day.

### Full Feature List

- **OAuth2 client-credentials authentication** against the official Danfoss developer API, with automatic token refresh and a 30-second safety margin before expiry.
- **Credentials managed via Homey settings UI** (API key + secret from developer.danfoss.com), with live re-authentication when settings change — no app restart required.
- **Configurable polling interval** persisted in app settings, clamped to a safe 10–300 second range.
- **Centralised device cache** broadcast to all drivers via a single `danfoss_ally_update` event, keeping device instances in sync without redundant API calls.
- **Write-aware polling**: a poll triggered within 1 second of a user-initiated write is deferred to prevent stale values overwriting fresh ones.
- **Graceful rate-limit handling** with `RATE_LIMITED` error code and `retryAfter` hint surfaced in logs.
- **Flow triggers**: `Temperature changed` (with temperature token) for thermostats and room sensors.
- **Flow conditions**: `Temperature is above X°C` for thermostats and room sensors.
- **Flow actions**: `Set temperature`, `Set mode` (per device), and `Set mode for all thermostats` (bulk).
- **Six operating modes** per thermostat: At home, Leaving home, Holiday (Away), Holiday (Home), Pause, Manual.
- **Floor temperature capability** (`measure_temperature.floor`) on the Icon Thermostat + Floor IR driver, separate from ambient temperature.
- **Humidity measurement** on Ally and Icon Room Sensors, plus on RT thermostats (added in v1.3.0).
- **Battery monitoring** with correct battery type per device (AA, AAA, CR2450).
- **Boiler relay heat-demand indicator** on the Ally Gateway, exposing whether the system is currently calling for heat — usable in Insights and Flows.
- **Bilingual UI** (English and Dutch) for app metadata and store listing.
- **Standard pairing flow** (`list_devices` → `add_devices`) across every driver for a consistent onboarding experience.
- **Lifecycle-safe**: polling is cleanly torn down in `onUninit`, preventing zombie intervals on app reload.

---

## Hero Image Suggestion

A clean, editorial-style hero in landscape (16:9):

> A close-up of a modern white Danfoss radiator thermostat mounted on a slim white radiator beneath a frost-touched window in a calm Scandinavian living room — soft morning light, muted greys and warm wood tones, a faint glow on the thermostat dial suggesting it has just adjusted itself. In the soft-focus background, a Homey Pro hub sits on a shelf, its LED ring subtly lit. Mood: quiet, intelligent, effortless comfort. Style: photoreal, shallow depth of field, cinematic colour grade with a hint of Danfoss red as the dial accent.

Alternative concept: a flat-lay diagram showing a Homey hub at the centre with elegant lines connecting it to multiple Danfoss devices (radiator thermostat, Icon floor-heating panel, room sensor) over a soft architectural floor-plan background — best for a more technical/illustrative article header.
