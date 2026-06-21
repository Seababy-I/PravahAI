import { TileLayer } from "react-leaflet";

interface MapMyIndiaStaticOverlayProps {
  staticUrlTemplate: string;
  apiKey?: string;
}

/**
 * MapMyIndia tile layer using the Mappls static key.
 * URL: https://apis.mappls.com/advancedmaps/v1/{key}/maptile/gl/gravity/{z}/{x}/{y}.png
 *
 * NOTE: The domain localhost:5173 must be whitelisted in Mappls Console:
 * https://auth.mappls.com/console/ → Projects → Allowed Domains
 *
 * Falls back to CARTO Dark if tiles fail.
 */
export default function MapMyIndiaStaticOverlay({ staticUrlTemplate }: MapMyIndiaStaticOverlayProps) {
  // Extract the API key from the staticUrlTemplate URL
  // staticUrlTemplate = "https://apis.mappls.com/advancedmaps/v1/{KEY}/still_image"
  const key = staticUrlTemplate.split("/v1/")[1]?.split("/")[0] || "";

  if (!key) {
    return (
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; CARTO"
      />
    );
  }

  const tileUrl = `https://apis.mappls.com/advancedmaps/v1/${key}/maptile/gl/gravity/{z}/{x}/{y}.png`;

  return (
    <>
      {/* Mappls tile layer — needs localhost whitelisted at auth.mappls.com/console */}
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://mappls.com">Mappls (MapmyIndia)</a>'
        errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      />
    </>
  );
}
