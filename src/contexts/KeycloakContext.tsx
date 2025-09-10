import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import apiService from '../services/api.service';

// Keycloak configuration (env overrides supported)
const KC_URL = process.env.REACT_APP_KEYCLOAK_URL || 'https://diam.dnext-pia.com';
const KC_REALM = process.env.REACT_APP_KEYCLOAK_REALM || 'orbitant-realm';
const KC_CLIENT_ID = process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'orbitant-ui-client';
const KC_REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/dashboard`;

interface KeycloakContextType {
  keycloak: Keycloak | null;
  authenticated: boolean;
  loading: boolean;
  token: string | null;
  userInfo: any | null;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasRealmRole: (role: string) => boolean;
}

const KeycloakContext = createContext<KeycloakContextType | undefined>(undefined);

export const useKeycloak = (): KeycloakContextType => {
  const context = useContext(KeycloakContext);
  if (context === undefined) {
    throw new Error('useKeycloak must be used within a KeycloakProvider');
  }
  return context;
};

interface KeycloakProviderProps {
  children: ReactNode;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return; // prevent double-init in React 18 StrictMode (dev)
    didInitRef.current = true;
    // Build Keycloak instance (do not manipulate URL before Keycloak processes callback)
    const kc = new Keycloak({
      url: KC_URL,
      realm: KC_REALM,
      clientId: KC_CLIENT_ID,
    });
    setKeycloak(kc);
    let refreshTimeout: number | undefined;
    let reauthInProgress = false;

    kc.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      silentCheckSsoFallback: false,
    })
      .then((auth) => {
        if (!auth) {
          kc.login({ redirectUri: KC_REDIRECT_URI });
          setAuthenticated(false);
          return;
        }
        setAuthenticated(true);
        setToken(kc.token ?? null);
        if (kc.token) {
          apiService.setAuthToken(kc.token);
        }
        if (kc.tokenParsed) {
          const info = {
            sub: kc.tokenParsed.sub,
            email: kc.tokenParsed.email,
            name: kc.tokenParsed.name,
            preferred_username: kc.tokenParsed.preferred_username,
            given_name: kc.tokenParsed.given_name,
            family_name: kc.tokenParsed.family_name,
          };
          setUserInfo(info);
        }
        // Clean fragment params after Keycloak callback
        if (window.location.hash.includes('code=') || window.location.hash.includes('state=')) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
        // Adaptive token refresh based on token expiry
        const scheduleRefresh = () => {
          try {
            const expMs = kc.tokenParsed?.exp ? kc.tokenParsed.exp * 1000 : undefined;
            const now = Date.now();
            // refresh 60s before expiry; minimum 30s
            const delay = expMs ? Math.max(30000, expMs - now - 60000) : 60000;
            if (refreshTimeout) window.clearTimeout(refreshTimeout);
            refreshTimeout = window.setTimeout(() => {
              kc.updateToken(60)
                .then((refreshed) => {
                  if (refreshed) {
                    setToken(kc.token ?? null);
                    if (kc.token) apiService.setAuthToken(kc.token);
                  }
                  scheduleRefresh();
                })
                .catch(() => {
                  if (!reauthInProgress) {
                    reauthInProgress = true;
                    kc.login({ redirectUri: KC_REDIRECT_URI });
                  }
                });
            }, delay);
          } catch {
            // fallback: try again in 60s
            refreshTimeout = window.setTimeout(() => scheduleRefresh(), 60000);
          }
        };
        scheduleRefresh();
      })
      .catch((err) => {
        console.error('Keycloak init error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Token expired handler as a backup
    kc.onTokenExpired = () => {
      kc.updateToken(30).then((refreshed) => {
        if (refreshed) setToken(kc.token ?? null);
      }).catch(() => kc.login({ redirectUri: KC_REDIRECT_URI }));
    };

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const login = () => {
    if (!keycloak) return;
    keycloak.login({ redirectUri: KC_REDIRECT_URI });
  };

  const logout = () => {
    apiService.clearAuthToken();
    sessionStorage.removeItem('kc_login_attempted');
    keycloak?.logout({ redirectUri: KC_REDIRECT_URI });
  };

  const hasRole = (role: string): boolean => {
    // Accept both client (resource) roles and realm roles for convenience
    return !!(
      keycloak?.hasResourceRole(role, KC_CLIENT_ID) ||
      keycloak?.hasRealmRole(role)
    );
  };

  const hasRealmRole = (role: string): boolean => {
    return keycloak?.hasRealmRole(role) || false;
  };

  const contextValue: KeycloakContextType = {
    keycloak,
    authenticated,
    loading,
    token,
    userInfo,
    login,
    logout,
    hasRole,
    hasRealmRole,
  };

  return (
    <KeycloakContext.Provider value={contextValue}>
      {children}
    </KeycloakContext.Provider>
  );
};
