# ShadowEvent AI - Frontend

Proactive traffic intelligence platform for Bengaluru.

## Current MapMyIndia Integration

We have fully integrated MapMyIndia as the primary visualization layer for ShadowEvent AI.

**Implemented Capabilities:**
* **Base Maps:** We utilize the MapMyIndia Static Key API to dynamically generate a slippy map background (`still_image`) that follows the user's viewport, providing a fully interactive experience without needing REST/Interactive API access.
* **Visualization:** All historical Shadow Events, SERI Risk Layers, Hotspots, and Event Heatmaps overlay seamlessly on top of the MapMyIndia base map.
* **Location Selection:** The What-If Simulator features click-to-select map interaction, automatically pulling nearby shadow events and hotspots using coordinates from the MapMyIndia overlay.

**Future Upgrades (Requires full REST/OAuth access):**
* Traffic Layer (Live traffic volume)
* Routing (A-to-B navigation factoring in Shadow Events)
* Road Closures & Event Feeds
* Live Traffic Intelligence updates directly via Mappls SDKs

This separation ensures the core product runs smoothly today with just the Static Key, while laying the groundwork for robust future extensions.
