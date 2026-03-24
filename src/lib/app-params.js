const isNode = typeof window === 'undefined';
const storage = isNode ? new Map() : window.localStorage;

const get = (key, def) => {
  if (isNode) return def;
  const url = new URLSearchParams(window.location.search).get(key);
  if (url) { storage.setItem(`base44_${key}`, url); return url; }
  return storage.getItem(`base44_${key}`) || def || null;
};

export const appParams = {
  appId:            get('app_id', import.meta.env?.VITE_BASE44_APP_ID),
  token:            get('access_token'),
  functionsVersion: get('functions_version', import.meta.env?.VITE_BASE44_FUNCTIONS_VERSION),
  appBaseUrl:       get('app_base_url', import.meta.env?.VITE_BASE44_APP_BASE_URL),
};
