import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- Admin passcode (master) ---
const ADMIN_KEY = "mediahub_admin_passcode";
export const setAdminPasscode = (code) => sessionStorage.setItem(ADMIN_KEY, code);
export const getAdminPasscode = () => sessionStorage.getItem(ADMIN_KEY) || "";
export const clearAdminPasscode = () => sessionStorage.removeItem(ADMIN_KEY);
const adminHeaders = () => ({ "X-Admin-Passcode": getAdminPasscode() });

// --- Per-profile passcode (used for media + section reorder endpoints) ---
const profileKey = (id) => `mh_passcode_${id}`;
export const setProfilePasscode = (id, code) =>
  sessionStorage.setItem(profileKey(id), code);
export const getProfilePasscode = (id) =>
  sessionStorage.getItem(profileKey(id)) || "";
export const clearProfilePasscode = (id) =>
  sessionStorage.removeItem(profileKey(id));
const profileHeaders = (id) => ({ "X-Profile-Passcode": getProfilePasscode(id) });

// --- Public profile endpoints ---
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

// --- Admin profile CRUD ---
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

// --- Media (all require X-Profile-Passcode) ---
export const listMedia = async (profileId) => {
  const { data } = await api.get(`/profiles/${profileId}/media`, {
    headers: profileHeaders(profileId),
  });
  return data;
};

export const createMedia = async (profileId, payload) => {
  const { data } = await api.post(`/profiles/${profileId}/media`, payload, {
    headers: profileHeaders(profileId),
  });
  return data;
};

export const updateMedia = async (profileId, mediaId, payload) => {
  const { data } = await api.put(
    `/profiles/${profileId}/media/${mediaId}`,
    payload,
    { headers: profileHeaders(profileId) }
  );
  return data;
};

export const deleteMedia = async (profileId, mediaId) => {
  const { data } = await api.delete(
    `/profiles/${profileId}/media/${mediaId}`,
    { headers: profileHeaders(profileId) }
  );
  return data;
};

export const reorderMedia = async (profileId, sectionLabel, mediaIds) => {
  const { data } = await api.post(
    `/profiles/${profileId}/media/reorder`,
    { sectionLabel, mediaIds },
    { headers: profileHeaders(profileId) }
  );
  return data;
};

// Reorder a profile's section labels (profile-passcode gated).
// Server enforces "same set, only reordered" — no add/remove via this endpoint.
export const reorderSections = async (profileId, sections) => {
  const { data } = await api.post(
    `/profiles/${profileId}/sections/reorder`,
    { sections },
    { headers: profileHeaders(profileId) }
  );
  return data;
};

// Public oEmbed proxy: pass a YouTube/Vimeo watch URL, get
// {provider, title, description, thumbnail_url, author_name}.
export const oembedLookup = async (url) => {
  const { data } = await api.get("/oembed", { params: { url } });
  return data;
};

export default api;
