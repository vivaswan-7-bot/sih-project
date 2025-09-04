const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function api(path, { method = 'GET', body, token, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json'; // ✅ only set if not FormData
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body
      ? isFormData
        ? body // ✅ send as-is (FormData)
        : JSON.stringify(body)
      : undefined,
  });

  // try to parse JSON; if fails, throw text
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data?.error || JSON.stringify(data));
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data;
}

export const AuthAPI = {
  register: (payload) => api('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => api('/auth/login',    { method: 'POST', body: payload }),
};

export const PostAPI = {
  // ✅ File uploads supported
  create: (token, payload) => {
    const formData = new FormData();

    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.eventType) formData.append('eventType', payload.eventType);
    if (payload.latitude) formData.append('latitude', payload.latitude);
    if (payload.longitude) formData.append('longitude', payload.longitude);

    // multiple files
    if (payload.media && payload.media.length) {
      for (let i = 0; i < payload.media.length; i++) {
        formData.append('media', payload.media[i]);
      }
    }

    return api('/posts', {
      method: 'POST',
      body: formData,
      token,
      isFormData: true, // ✅ tell helper not to add JSON headers
    });
  },

  feed:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/posts${qs ? `?${qs}` : ''}`);
  },
  getOne: (id) => api(`/posts/${id}`),
  like:   (token, id) => api(`/posts/${id}/like`,   { method: 'POST', body: {}, token }),
  react:  (token, id, reaction) => api(`/posts/${id}/react`, { method: 'POST', body: { reaction }, token }),
  comment:(token, id, text) => api(`/posts/${id}/comment`, { method: 'POST', body: { text }, token }),
  repost: (token, id) => api(`/posts/${id}/repost`, { method: 'POST', body: {}, token }),
};

export const DashboardAPI = {
  summary: (token) => api('/dashboard/summary', { token }),
  reports: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/dashboard/reports${qs ? `?${qs}` : ''}`, { token });
  },
};
