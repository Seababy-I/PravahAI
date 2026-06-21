import axios from "axios";
import API_BASE from "./client";

const api = axios.create({ baseURL: API_BASE });

export const getStats = (params?: Record<string, unknown>) => api.get("/stats", { params }).then(r => r.data);
export const getShadowEvents = (params?: Record<string, unknown>) => api.get("/shadow-events", { params }).then(r => r.data);
export const getRiskCalendar = () => api.get("/risk-calendar").then(r => r.data);
export const getHotspots = (params?: Record<string, unknown>) => api.get("/hotspots", { params }).then(r => r.data);
export const getMapData = (params?: Record<string, unknown>) => api.get("/map-data", { params }).then(r => r.data);
export const searchIncidents = (params?: Record<string, unknown>) => api.get("/search", { params }).then(r => r.data);
export const getSimilarEvents = (id: string, top_k = 10) => api.get(`/similar-events/${id}`, { params: { top_k } }).then(r => r.data);
export const getCorridors = () => api.get("/corridors").then(r => r.data.corridors as string[]);
export const getCauses = () => api.get("/causes").then(r => r.data.causes as string[]);
export const getZones = () => api.get("/zones").then(r => r.data.zones as string[]);
