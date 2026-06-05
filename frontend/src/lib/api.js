import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const ADMIN_KEY = "mediahub_admin_passcode";

export const setAdminPasscode = (code) => sessionStorage.setItem(ADMIN_KEY, code);
export const getAdminPasscode = () => sessionStorage.getItem(ADMIN_KEY) || "";
export const clearAdminPasscode = () => sessionStorage.removeItem(ADMIN_KEY);

const adminHeaders = () => ({ "X-Admin-Passcode": getAdminPasscode() });

export const listProfiles = async () => {
  const { data } = await api.get("/profiles");
  return data;
};

export const verifyProfile = async (id, passcode) => {
  const { data } = await api.post(`/profiles/${id}/verify`, { passcode });
  return data;
};

export const verifyAdmin = async (passcode) => {
  const { data } = await api.post("/admin/verify", { passcode });
  return data;
};

export const adminListProfiles = async () => {
  const { data } = await api.get("/admin/profiles", { headers: adminHeaders() });
  return data;
};

export const adminCreateProfile = async (payload) => {
  const { data } = await api.post("/admin/profiles", payload, { headers: adminHeaders() });
  return data;
};

export const adminUpdateProfile = async (id, payload) => {
  const { data } = await api.put(`/admin/profiles/${id}`, payload, { headers: adminHeaders() });
  return data;
};

export const adminDeleteProfile = async (id) => {
  const { data } = await api.delete(`/admin/profiles/${id}`, { headers: adminHeaders() });
  return data;
};

// --- Media ---
export const listMedia = async (profileId) => {
  const { data } = await api.get(`/profiles/${profileId}/media`);
  return data;
};

export const createMedia = async (profileId, payload) => {
  const { data } = await api.post(`/profiles/${profileId}/media`, payload);
  return data;
};

export const updateMedia = async (profileId, mediaId, payload) => {
  const { data } = await api.put(`/profiles/${profileId}/media/${mediaId}`, payload);
  return data;
};

export const deleteMedia = async (profileId, mediaId) => {
  const { data } = await api.delete(`/profiles/${profileId}/media/${mediaId}`);
  return data;
};

export default api;
