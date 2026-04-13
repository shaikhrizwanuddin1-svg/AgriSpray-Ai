import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSession, logoutSession, type AuthUser, type VerifyOtpResponse } from "@/lib/auth-api";

const STORAGE_KEY = "agrispray-auth-session-v1";

type StoredSession = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  isLoggingOut: boolean;
  completeLogin: (payload: VerifyOtpResponse) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredSession = (): StoredSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const writeStoredSession = (session: StoredSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const storedSession = readStoredSession();
    if (!storedSession) {
      setIsReady(true);
      return;
    }

    setSession(storedSession);

    let cancelled = false;

    void fetchSession(storedSession.token)
      .then((user) => {
        if (cancelled) {
          return;
        }

        const nextSession = { token: storedSession.token, user };
        setSession(nextSession);
        writeStoredSession(nextSession);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSession(null);
        writeStoredSession(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeLogin = (payload: VerifyOtpResponse) => {
    const nextSession = {
      token: payload.token,
      user: payload.user,
    };

    setSession(nextSession);
    writeStoredSession(nextSession);
  };

  const logout = async () => {
    const token = session?.token;

    setIsLoggingOut(true);
    try {
      if (token) {
        await logoutSession(token);
      }
    } finally {
      setSession(null);
      writeStoredSession(null);
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        isReady,
        isLoggingOut,
        completeLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
