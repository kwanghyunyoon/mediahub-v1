const key = (profileId) => `mh_list_${profileId}`;

export function getMyList(profileId) {
  try { return JSON.parse(localStorage.getItem(key(profileId)) || "[]"); }
  catch { return []; }
}

export function toggleMyList(profileId, itemId, current) {
  const next = current.includes(itemId)
    ? current.filter((i) => i !== itemId)
    : [...current, itemId];
  localStorage.setItem(key(profileId), JSON.stringify(next));
  return next;
}
