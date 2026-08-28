/**
 * Auth API
 * --------
 * All requests use credentials: 'include' so the browser automatically
 * sends/receives the HttpOnly session cookie set by the backend.
 *
 * The token is NEVER stored in localStorage or any JS-accessible storage.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export const login = async (
  username: string,
  password: string
): Promise<{ success?: boolean; token?: string; error?: string }> => {
  const response = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // send/receive cookies
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid credentials');
  }

  return response.json();
};

export const logout = async (): Promise<void> => {
  await fetch(`${API_BASE}/api/admin/logout`, {
    method: 'POST',
    credentials: 'include',
  });
};

export const verifySession = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/session`, {
      method: 'GET',
      credentials: 'include',   // cookie is sent automatically by browser
    });

    if (response.ok) {
      const data = await response.json();
      return data.valid === true;
    }
    return false;
  } catch {
    return false;
  }
};
