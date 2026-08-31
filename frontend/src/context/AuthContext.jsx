import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axiosInstance";

// In plain terms: this keeps track of "is someone logged in, and who" for
// the whole app, so any page can ask useAuth() to find out - instead of each
// page tracking login state separately.
//
// Simple auth state shared across the app, backed by localStorage so a login
// survives a page refresh. An account is optional here (see backend
// middleware/auth.js's optionalAuth) - most of the app works fine logged
// out; this context only matters for the "My Inspiration Board" feature.

const AuthContext = createContext(null);

const TOKEN_KEY = "weddinglens_token";
const USER_KEY = "weddinglens_user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Single place that writes (or clears, when nextToken is null/undefined)
  // the token+user pair to both localStorage and React state, so the two
  // never drift out of sync with each other.
  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  // Calls the login API and persists the returned token/user on success;
  // throws (letting the caller's form show the error) on failure.
  const login = useCallback(
    async (email, password) => {
      const response = await api.post("/api/auth/login", { email, password });
      persist(response.data.token, response.data.user);
      return response.data.user;
    },
    [persist]
  );

  // Calls the register API and persists the returned token/user on success -
  // registering logs the user in immediately, no separate login step needed.
  const register = useCallback(
    async (email, password, displayName) => {
      const response = await api.post("/api/auth/register", { email, password, displayName });
      persist(response.data.token, response.data.user);
      return response.data.user;
    },
    [persist]
  );

  // Clears the session (token + user) both client-side and in localStorage.
  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  // Keep axios's default header in sync with the current token so every
  // request (including ones made outside a component, if any) carries it.
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  // A token surviving in localStorage only proves someone logged in here at
  // some point - not that the account still exists (e.g. a test account
  // that's since been deleted). Revalidate against the server once per
  // load and clear the session if it's no longer valid, so pages don't
  // keep treating a stale/orphaned token as a real login indefinitely (its
  // JWT signature stays "valid" for the full 30-day expiry regardless of
  // whether the account behind it still exists - see backend GET /api/auth/me).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get("/api/auth/me")
      .then((response) => {
        if (!cancelled) persist(token, response.data.user);
      })
      .catch((err) => {
        if (!cancelled && err.response?.status === 401) persist(null, null);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally only on mount / when the token identity changes, not on
    // every persist() - re-running this every time persist() is called
    // (which login/logout themselves trigger) would just re-verify a token
    // we already know is fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: Boolean(token), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook for consuming the auth context - throws early with a
// clear message if used outside an AuthProvider, instead of a confusing
// "cannot read property of null" deeper in whatever called it.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
