import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));
  const [sessionMessage, setSessionMessage] = useState("");

  const logout = useCallback((message = "") => {
    tokenStore.set(null);
    setUser(null);
    setSessionMessage(message);
  }, []);

  // Restore the session on page load
  useEffect(() => {
    setUnauthorizedHandler((msg) => logout(msg || "Your session has ended. Please log in again."));
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, [logout]);

  // Used by login and reset-password: both return { token, user }
  const startSession = useCallback(({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
    setSessionMessage("");
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await authApi.login({ email, password });
      startSession(res);
      return res.user;
    },
    [startSession],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      isTechnician: user?.role === "technician",
      sessionMessage,
      login,
      logout,
      startSession,
      setUser,
      // change-password returns a fresh token; the old one stops working
      replaceToken: (token) => tokenStore.set(token),
    }),
    [user, loading, sessionMessage, login, logout, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
