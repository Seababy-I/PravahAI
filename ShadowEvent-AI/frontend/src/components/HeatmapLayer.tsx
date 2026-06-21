/**
 * HeatmapLayer — wraps leaflet.heat (npm package) for react-leaflet.
 * Usage: <HeatmapLayer points={[[lat, lon, intensity], ...]} options={{ radius: 20 }} />
 *
 * Points format: [lat, lon, intensity] where intensity is 0..1
 */
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
// Import leaflet.heat: it patches L to add L.heatLayer
import "leaflet.heat";

// Extend Leaflet types for leaflet.heat
declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}

interface HeatmapLayerProps {
  points: number[][];
  options?: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    minOpacity?: number;
    gradient?: Record<number, string>;
  };
}

export default function HeatmapLayer({ points, options }: HeatmapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!points?.length) return;

    // Remove previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const heatPoints = points.map(p => [p[0], p[1], p[2] ?? 1] as [number, number, number]);

    layerRef.current = (L as any).heatLayer(heatPoints, {
      radius: 22,
      blur: 20,
      maxZoom: 17,
      minOpacity: 0.4,
      gradient: { 0.2: "#0ea5e9", 0.5: "#f59e0b", 0.8: "#ef4444" },
      ...options,
    });

    layerRef.current!.addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, options]);

  return null;
}
