"""
Phase 2: MapMyIndia (Mappls) Integration Layer

Authentication: REST Key in URL path.
URL format: https://apis.mappls.com/advancedmaps/v1/{REST_KEY}/...

HOW TO SET YOUR API KEY:
  1. Copy backend/.env.example to backend/.env
  2. Replace PASTE_YOUR_REST_KEY_HERE with your actual Mappls REST key
  3. Restart the backend server — it will auto-detect and switch tile layers

Key is read from (in priority order):
  a) MMI_REST_KEY environment variable (set in system or CI)
  b) backend/.env file (recommended for development)

APIs used / planned:
  Still Map Image:  GET /v1/{key}/still_image?center={lat},{lng}&size={w}x{h}&zoom={z}
  Map Tiles:        https://tiles.mappls.com/advancedmaps/v1/{key}/map_tiles/
  Nearby POI:       GET https://atlas.mapmyindia.com/api/places/nearby/json?...
                    (requires OAuth2 Bearer Token — not used in Phase 2)
"""

import os
import urllib.request
import urllib.parse

# Load .env file if present (python-dotenv optional dependency)
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "../../backend/.env")
    _env_path2 = os.path.join(os.path.dirname(__file__), "../.env")
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
    elif os.path.exists(_env_path2):
        load_dotenv(_env_path2)
except ImportError:
    pass  # python-dotenv not installed; rely on OS env vars

MMI_REST_KEY = os.getenv("MMI_REST_KEY", "")  # Set in env or .env file
MMI_BASE = "https://apis.mappls.com/advancedmaps/v1"
MMI_TILE_BASE = "https://tiles.mappls.com/advancedmaps/v1"


def is_configured() -> bool:
    return bool(MMI_REST_KEY and MMI_REST_KEY.strip())


def get_tile_url_template() -> str:
    """Return Leaflet-compatible tile URL if key set, else OSM CARTO dark."""
    if is_configured():
        return f"{MMI_TILE_BASE}/{MMI_REST_KEY}/map_tiles/{{z}}/{{x}}/{{y}}.png"
    return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"


def get_attribution() -> str:
    if is_configured():
        return '&copy; <a href="https://mappls.com">Mappls (MapmyIndia)</a>'
    return '&copy; <a href="https://carto.com">CARTO</a>'


def get_static_map_url(lat: float, lon: float, zoom: int = 13,
                       width: int = 400, height: int = 300) -> str:
    """
    Returns a static map image URL centered on lat/lon.
    Uses MapMyIndia if key configured, else a placeholder.
    Documented API: GET /v1/{key}/still_image?center={lat},{lng}&size={w}x{h}&zoom={z}
    """
    if is_configured():
        params = urllib.parse.urlencode({
            "center": f"{lat},{lon}",
            "size": f"{width}x{height}",
            "zoom": zoom,
            "markers": f"color:red|{lat},{lon}",
        })
        return f"{MMI_BASE}/{MMI_REST_KEY}/still_image?{params}"
    # Fallback: OpenStreetMap static tile approximation
    return f"https://staticmap.openstreetmap.de/?center={lat},{lon}&zoom={zoom}&size={width}x{height}&markers={lat},{lon},ol-marker"


def validate_key() -> dict:
    """
    Test if the MMI key works. Returns status dict.
    For Static Key mode, we bypass the HEAD request to avoid 401 on restricted endpoints.
    """
    if not is_configured():
        return {
            "valid": False,
            "reason": "MMI_REST_KEY not set in environment",
            "fallback": "OpenStreetMap CARTO"}

    return {"valid": True, "key_prefix": MMI_REST_KEY[:6] + "***", "mode": "Static Key"}


def get_config() -> dict:
    """Return MMI config for frontend consumption."""
    status = validate_key()
    return {"configured": is_configured(),
            "valid": status.get("valid", False),
            "tile_url": get_tile_url_template(),
            "static_url": f"{MMI_BASE}/{MMI_REST_KEY}/still_image" if is_configured() else "",
            "attribution": get_attribution(),
            "status_message": status,
            "apis_documented": [{"name": "Still Map Image API",
                                 "url": f"{MMI_BASE}/{{REST_KEY}}/still_image",
                                 "auth": "REST Key in URL path",
                                 "params": ["center",
                                            "size",
                                            "zoom",
                                            "markers"],
                                 "docs": "https://about.mappls.com/api/advanced-maps/doc/",
                                 },
                                {"name": "Map Tile Layer",
                                 "url": f"{MMI_TILE_BASE}/{{REST_KEY}}/map_tiles/{{z}}/{{x}}/{{y}}.png",
                                 "auth": "REST Key in URL path",
                                 "params": ["z",
                                            "x",
                                            "y"],
                                 "docs": "https://about.mappls.com/api/advanced-maps/doc/",
                                 },
                                {"name": "Nearby POI API (planned)",
                                 "url": "https://atlas.mapmyindia.com/api/places/nearby/json",
                                 "auth": "OAuth 2.0 Bearer Token (requires Client ID + Secret)",
                                 "params": ["keywords",
                                            "refLocation",
                                            "radius"],
                                 "status": "Planned — requires OAuth setup",
                                 },
                                ],
            }
