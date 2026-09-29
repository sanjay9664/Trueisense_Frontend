/**
 * BMS Authentication & API Service
 * 
 * Provides unified authentication, session management, token refresh with rotation,
 * single-flight request queueing for concurrent 401s, route protection helpers,
 * and seamless Bearer token injection.
 * 
 * OpenAPI Source of Truth: Docs/Openapi.yaml
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} [roleName]
 * @property {string[]} permissions
 * @property {Record<string, boolean>} features
 * @property {unknown[]} [zoneLocations]
 * @property {string|null} [scopeType]
 * @property {string|null} [scopeId]
 * @property {string|null} [tenantId]
 * @property {string|null} [organizationId]
 * @property {string|null} [siteId]
 */

/**
 * @typedef {Object} AuthResponseData
 * @property {AuthUser} user
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} expiresIn
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success
 * @property {AuthResponseData} data
 */

/**
 * @typedef {Object} RefreshResponseData
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} expiresIn
 */

/**
 * @typedef {Object} RefreshResponse
 * @property {boolean} success
 * @property {RefreshResponseData} data
 */

// Storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const EXPIRES_IN_KEY = 'expiresIn';
const USER_DATA_KEY = 'userData';
const USER_ROLE_KEY = 'userRole';
const IS_AUTHENTICATED_KEY = 'isAuthenticated';
const TOKEN_TIMESTAMP_KEY = 'token_timestamp';
const TOKEN_EXPIRES_AT_KEY = 'token_expires_at';
const REMEMBER_ME_KEY = 'rememberMe';
const SOCHIOT_PLATFORM_TOKEN_KEY = 'sochiot_platform_token';

// Legacy keys synchronized for backward compatibility with existing components
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_SOCHIOT_TOKEN_KEY = 'sochiot_token';

/**
 * Get BMS API Base URL
 */
export const getBmsApiUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_BMS_URL) {
      return import.meta.env.VITE_BACKEND_BMS_URL;
    }
  } catch (e) {}
  return 'http://localhost:3001/api/v1';
};

/**
 * Token and Storage Getters
 */
export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_SOCHIOT_TOKEN_KEY) ||
    null;
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const getUserRole = () => {
  return localStorage.getItem(USER_ROLE_KEY) || 'USER';
};

export const getExpiresIn = () => {
  return Number(localStorage.getItem(EXPIRES_IN_KEY)) || 900;
};

export const isAuthenticated = () => {
  return localStorage.getItem(IS_AUTHENTICATED_KEY) === 'true' && !!getAccessToken();
};

/**
 * Check if the access token has expired or is about to expire within 30 seconds
 */
export const isTokenExpired = () => {
  const token = getAccessToken();
  if (!token) return true;

  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY));
  if (expiresAt && !isNaN(expiresAt)) {
    return Date.now() >= (expiresAt - 30000);
  }

  const timestamp = Number(localStorage.getItem(TOKEN_TIMESTAMP_KEY));
  const expiresIn = getExpiresIn();
  if (timestamp && !isNaN(timestamp)) {
    return (Date.now() - timestamp) >= ((expiresIn - 30) * 1000);
  }

  // Fallback: Inspect JWT expiration if available
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp) {
        return Date.now() >= ((payload.exp * 1000) - 30000);
      }
    }
  } catch (e) {}

  return false;
};

/**
 * Normalize Auth User from the BMS contract
 * @param {Partial<AuthUser>} rawUser
 * @returns {AuthUser}
 */
export const normalizeAuthUser = (rawUser = {}) => {
  const role = rawUser.role || 'USER';
  const permissions = Array.isArray(rawUser.permissions) ? rawUser.permissions : [];
  const features = rawUser.features && typeof rawUser.features === 'object' ? rawUser.features : {};
  const isSuper = role === 'SUPER_ADMIN' || permissions.includes('*');
  const isAdmin = role === 'ADMIN';
  const roleName = rawUser.roleName || (isSuper ? 'Super Admin' : isAdmin ? 'Administrator' : role);

  return {
    id: rawUser.id || rawUser._id || rawUser.scopeId || 'user-id',
    name: rawUser.name || 'User',
    email: rawUser.email || '',
    role: role,
    roleName: roleName,
    permissions: permissions,
    features: features,
    zoneLocations: Array.isArray(rawUser.zoneLocations) ? rawUser.zoneLocations : [],
    scopeType: rawUser.scopeType || null,
    scopeId: rawUser.scopeId || null,
    tenantId: rawUser.tenantId || (rawUser.scopeType === 'TENANT' ? rawUser.scopeId : null),
    organizationId: rawUser.tenantId || (rawUser.scopeType === 'TENANT' ? rawUser.scopeId : null),
    siteId: rawUser.siteId || (rawUser.scopeType === 'SITE' ? rawUser.scopeId : null)
  };
};

/**
 * Synchronize UI modules config and feature permissions based on user features and role
 */
export const syncSidebarAndFeaturePermissions = (user) => {
  const isSuper = user.role === 'SUPER_ADMIN' || (user.permissions && user.permissions.includes('*'));
  const isPowerUser = isSuper || user.role === 'ADMIN';
  const feats = user.features || {};

  const sidebarMapping = {
    "Dashboard": feats.dashboard ?? isPowerUser ?? true,
    "Water Management": feats.waterManagement ?? feats.showWaterManagement ?? isPowerUser ?? true,
    "Motors": feats.motors ?? feats.showMotors ?? isPowerUser ?? true,
    "DG Set": feats.dgSet ?? feats.showDGSet ?? isPowerUser ?? true,
    "Setting Templates": feats.settingTemplates ?? feats.showSettingTemplates ?? isPowerUser ?? true,
    "Alarm System": feats.alarm ?? feats.alarms ?? feats.showAlarms ?? isPowerUser ?? true,
    "LT Panel": feats.ltPanel ?? feats.showLTPanel ?? isPowerUser ?? true,
    "Transformer": feats.transformers ?? feats.transformer ?? feats.showTransformers ?? isPowerUser ?? true,
    "Fire": feats.fire ?? feats.firePumps ?? feats.showFirePumps ?? isPowerUser ?? true,
    "Ticketing": feats.ticket ?? feats.ticketing ?? feats.showTicketing ?? isPowerUser ?? true,
    "Maintenance": feats.maintenance ?? feats.showMaintenance ?? isPowerUser ?? true,
    "Service History": feats.serviceHistory ?? feats.showServiceHistory ?? isPowerUser ?? true,
    "Daily DPR": feats.dpr ?? feats.dailyDPR ?? feats.showDailyDPR ?? isPowerUser ?? true,
    "Energy Metering": true,
    "VRV": feats.vrv ?? feats.showVRV ?? isPowerUser ?? true,
    "AQI Sensor": true,
    "HVAC": false,
    "AC": true
  };

  localStorage.setItem('scada_modules_config', JSON.stringify(sidebarMapping));

  const featurePermissions = {
    showDashboard: sidebarMapping["Dashboard"],
    showWaterManagement: sidebarMapping["Water Management"],
    showMotors: sidebarMapping["Motors"],
    showDGSet: sidebarMapping["DG Set"],
    showSettingTemplates: sidebarMapping["Setting Templates"],
    showAlarms: sidebarMapping["Alarm System"],
    showLTPanel: sidebarMapping["LT Panel"],
    showTransformers: sidebarMapping["Transformer"],
    showFirePumps: sidebarMapping["Fire"],
    showTicketing: sidebarMapping["Ticketing"],
    showMaintenance: sidebarMapping["Maintenance"],
    showServiceHistory: sidebarMapping["Service History"],
    showDailyDPR: sidebarMapping["Daily DPR"],
    showEnergyMetering: true,
    showEnergyMetering_read: true,
    energyMetering: true,
    showVRV: sidebarMapping["VRV"],
    showAQISensor: true,
    showAQISensor_read: true,
    aqiSensor: true,
    showHVAC: false,
    showHVAC_read: false,
    hvac: false,
    showAC: true,
    showAC_read: true,
    ac: true,
    ...feats,
    showEnergyMetering: true,
    showEnergyMetering_read: true,
    energyMetering: true,
    showAQISensor: true,
    showAQISensor_read: true,
    aqiSensor: true,
    showHVAC: false,
    showHVAC_read: false,
    hvac: false,
    showAC: true,
    showAC_read: true,
    ac: true
  };

  localStorage.setItem('scada_feature_permissions', JSON.stringify(featurePermissions));
};

/**
 * Store the complete authentication session
 */
export const setAuthSession = ({ accessToken, refreshToken, user, expiresIn }) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_SOCHIOT_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  const exp = Number(expiresIn) || 900;
  localStorage.setItem(EXPIRES_IN_KEY, String(exp));
  localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, (Date.now() + exp * 1000).toString());
  localStorage.setItem(IS_AUTHENTICATED_KEY, 'true');

  if (user) {
    const normalized = normalizeAuthUser(user);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalized));
    localStorage.setItem(USER_ROLE_KEY, normalized.role);
    syncSidebarAndFeaturePermissions(normalized);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage-update'));
    window.dispatchEvent(new Event('storage'));
  }
};

/**
 * Clear all authentication tokens and cached user data
 */
export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SOCHIOT_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_IN_KEY);
  localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(IS_AUTHENTICATED_KEY);
  localStorage.removeItem(SOCHIOT_PLATFORM_TOKEN_KEY);
  localStorage.removeItem('scada_modules_config');
  localStorage.removeItem('scada_submodules_config');
  localStorage.removeItem('scada_feature_permissions');
  localStorage.removeItem('sochiot_email');
  localStorage.removeItem('sochiot_password');

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('auth_session_active');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage-update'));
    window.dispatchEvent(new Event('storage'));
  }
};

/**
 * Check if the current user has a specific permission (supports wildcard '*')
 * @param {string} permission
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
  if (
    permission === 'showEnergyMetering' || permission === 'energyMetering' || permission === 'Energy Metering' || permission?.startsWith?.('energy') ||
    permission === 'showAC' || permission === 'ac' || permission === 'AC' ||
    permission === 'showAQISensor' || permission === 'aqiSensor' || permission === 'AQI Sensor'
  ) {
    return true;
  }
  const user = getUser();
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes(permission);
};

/**
 * Check if the current user has a specific feature enabled
 * @param {string} featureKey
 * @returns {boolean}
 */
export const hasFeature = (featureKey) => {
  if (
    featureKey === 'showEnergyMetering' || featureKey === 'energyMetering' || featureKey === 'Energy Metering' ||
    featureKey === 'showAC' || featureKey === 'ac' || featureKey === 'AC' ||
    featureKey === 'showAQISensor' || featureKey === 'aqiSensor' || featureKey === 'AQI Sensor'
  ) {
    return true;
  }
  const user = getUser();
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const feats = user.features || {};
  return Boolean(feats[featureKey]);
};

/**
 * Filter templates by user role and organization
 * Handles both legacy numeric IDs (12=Zomato, 16/24=Hyperpure) and modern BMS scopes.
 * If user is SuperAdmin or Admin, or if no templates match, defaults safely without breaking.
 * @param {Array} templates
 * @param {Object} [userData]
 * @param {string} [userRole]
 * @returns {Array}
 */
export const filterTemplatesByOrg = (templates, userData = {}, userRole = '') => {
  if (!Array.isArray(templates) || templates.length === 0) return [];

  const storedUser = userData && Object.keys(userData).length > 0 ? userData : (getUser() || {});
  const role = (userRole || storedUser.role || localStorage.getItem(USER_ROLE_KEY) || 'USER').toUpperCase();
  const roleName = (storedUser.roleName || role || '').toLowerCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || roleName.includes('super');
  const isAdmin = role === 'ADMIN' || roleName.includes('admin') || roleName.includes('manager');

  // Super Admin and System Admins see all templates
  if (isSuperAdmin || isAdmin) {
    return templates;
  }

  const userOrgId = storedUser.organizationId || storedUser.tenantId || storedUser.scopeId;
  const numId = Number(userOrgId);
  const userOrgStr = (
    storedUser.organization ||
    storedUser.organizationName ||
    storedUser.tenantName ||
    storedUser.company ||
    storedUser.name ||
    storedUser.email ||
    ''
  ).toLowerCase();

  const filtered = templates.filter(t => {
    // 1. Explicit matching by tenantId / organizationId
    if (t.tenantId !== undefined && t.tenantId !== null && userOrgId !== undefined && userOrgId !== null) {
      if (String(t.tenantId) === String(userOrgId)) return true;
      if (!isNaN(numId) && Number(t.tenantId) === numId) return true;
    }

    // 2. Organization name from template mapping
    const orgName = (
      t.mapping?.globalHierarchy?.organization ||
      t.defaultValues?.mapping?.globalHierarchy?.organization ||
      t.defaultValues?.globalHierarchy?.organization ||
      ''
    ).toLowerCase();

    if (!orgName) return false;

    // Check legacy numeric IDs: 12 -> Zomato, 16/24 -> Hyperpure
    if (numId === 12 && (orgName.includes('zomato') || orgName.includes('oragnization'))) return true;
    if ((numId === 24 || numId === 16) && orgName.includes('hyperpure')) return true;

    // Check string match against user organization name / email / user display name
    if (userOrgStr.includes('hyperpure') && orgName.includes('hyperpure')) return true;
    if (userOrgStr.includes('zomato') && orgName.includes('zomato')) return true;
    if (orgName.includes(userOrgStr) || userOrgStr.includes(orgName)) return true;

    return false;
  });

  // Fallback: If no templates matched, return all templates so users are not left with an empty screen
  return filtered.length > 0 ? filtered : templates;
};

/**
 * BMS Login Request
 * POST /auth/login
 * 
 * Response contract:
 * {
 *   success: true,
 *   data: {
 *     user: { ... },
 *     accessToken: "...",
 *     refreshToken: "...",
 *     expiresIn: 900
 *   }
 * }
 */
export const login = async ({ email, password, rememberMe = true }) => {
  const bmsUrl = getBmsApiUrl();
  const response = await fetch(`${bmsUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, rememberMe })
  });

  const resData = await response.json().catch(() => null);

  if (!response.ok || !resData || !resData.success) {
    const errorMsg = resData?.error?.message || resData?.message || `Login failed (${response.status})`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = resData?.error?.details || resData?.details;
    err.code = resData?.error?.code || 'AUTH_ERROR';
    throw err;
  }

  const { accessToken, refreshToken, user, expiresIn } = resData.data || {};
  if (!accessToken) {
    throw new Error('Invalid authentication response from server');
  }

  localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('auth_session_active', 'true');
  }

  const normalizedUser = normalizeAuthUser(user);

  setAuthSession({
    accessToken,
    refreshToken,
    user: normalizedUser,
    expiresIn: expiresIn || 900
  });

  return {
    user: normalizedUser,
    accessToken,
    refreshToken,
    expiresIn: expiresIn || 900
  };
};

/**
 * Single-flight refresh token mechanism with concurrent request queueing
 * POST /auth/refresh
 * 
 * Request contract:
 * {
 *   refreshToken: "<refresh-token>"
 * }
 * 
 * Response contract:
 * {
 *   success: true,
 *   data: {
 *     accessToken: "...",
 *     refreshToken: "...",
 *     expiresIn: 900
 *   }
 * }
 * 
 * Rotates BOTH tokens upon success.
 */
let refreshPromise = null;

export const refreshAccessToken = async () => {
  // Return in-flight refresh promise to prevent duplicate concurrent refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearAuthSession();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const bmsUrl = getBmsApiUrl();
      const response = await fetch(`${bmsUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const resData = await response.json().catch(() => null);
      if (!resData || !resData.success || !resData.data?.accessToken) {
        clearAuthSession();
        return null;
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: newExpiresIn } = resData.data;

      // Rotate BOTH tokens in storage
      setAuthSession({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || currentRefreshToken,
        expiresIn: newExpiresIn || 900
      });

      return newAccessToken;
    } catch (error) {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * BMS Logout Request
 * POST /auth/logout
 * Clears local tokens and state regardless of network/server response.
 */
export const logout = async () => {
  const token = getAccessToken();
  try {
    if (token) {
      const bmsUrl = getBmsApiUrl();
      await fetch(`${bmsUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (err) {
    // Ignore network error or expired token during logout
  } finally {
    clearAuthSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

/**
 * Initialize and verify session on application startup / page refresh
 * Returns boolean indicating whether a valid session was restored.
 */
export const initAuthSession = async () => {
  const isAuth = localStorage.getItem(IS_AUTHENTICATED_KEY) === 'true';
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  // If rememberMe was false, check if session is still active in current browser lifetime
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  if (!rememberMe && typeof sessionStorage !== 'undefined') {
    const sessionActive = sessionStorage.getItem('auth_session_active');
    if (!sessionActive) {
      clearAuthSession();
      return false;
    }
  } else if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('auth_session_active', 'true');
  }

  if (!isAuth && !accessToken && !refreshToken) {
    return false;
  }

  // If access token is still fresh, restore session immediately
  if (accessToken && !isTokenExpired()) {
    return true;
  }

  // If access token is expired but refresh token exists, refresh and restore
  if (refreshToken) {
    const newToken = await refreshAccessToken();
    return Boolean(newToken);
  }

  clearAuthSession();
  return false;
};

/**
 * Helper to convert various Headers shapes into standard Headers instance
 */
const toHeaders = (headers) => {
  if (headers instanceof Headers) return new Headers(headers);
  if (Array.isArray(headers)) return new Headers(headers);
  return new Headers(headers || {});
};

/**
 * Authenticated fetch helper with Bearer token injection and automatic 401 retry
 */
export const fetchWithAuth = async (url, options = {}) => {
  let token = getAccessToken();
  if (!token) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      token = await refreshAccessToken();
    }
  }

  if (!token) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const headers = toHeaders(options.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // Handle 401: Refresh and retry once
  if (response.status === 401 && !options._retry) {
    const isAuthEndpoint = typeof url === 'string' && (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout'));
    if (!isAuthEndpoint) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders = toHeaders(options.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...options, headers: retryHeaders, _retry: true });
      } else {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
  }

  return response;
};

/**
 * Sochiot Platform Token Fetcher (Super Admin only - GET /auth/Access-token)
 * OpenAPI: Get Sochiot platform authentication token.
 * Note: Keeps Sochiot platform token completely separate from the BMS accessToken.
 */
export const getSochiotPlatformToken = async () => {
  const cached = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY);
  if (cached) return cached;

  const token = getAccessToken();
  if (!token) return null;

  try {
    const bmsUrl = getBmsApiUrl();
    const res = await fetch(`${bmsUrl}/auth/Access-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const d = await res.json();
      if (d.success && d.data?.token) {
        localStorage.setItem(SOCHIOT_PLATFORM_TOKEN_KEY, d.data.token);
        return d.data.token;
      }
    }
  } catch (e) {
    // Fail gracefully
  }
  return null;
};

/**
 * Global window.fetch Interceptor
 * Intercepts any 401 responses on Bearer-authenticated requests, performs
 * a single token refresh, and retries the original request once.
 */
let isInterceptorInstalled = false;

export const installFetchInterceptor = () => {
  if (isInterceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);

    if (response.status === 401 && !init._retry) {
      const url = typeof input === 'string' ? input : (input?.url || '');
      
      const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');
      if (isAuthUrl) {
        return response;
      }

      // Check if this request had an Authorization header
      const headers = init.headers || (input instanceof Request ? input.headers : null);
      let hasBearerAuth = false;
      if (headers) {
        if (headers instanceof Headers) {
          const authVal = headers.get('Authorization') || headers.get('authorization');
          hasBearerAuth = Boolean(authVal && authVal.toLowerCase().startsWith('bearer '));
        } else if (Array.isArray(headers)) {
          hasBearerAuth = headers.some(([k, v]) => k.toLowerCase() === 'authorization' && String(v).toLowerCase().startsWith('bearer '));
        } else if (typeof headers === 'object') {
          const authVal = headers['Authorization'] || headers['authorization'];
          hasBearerAuth = Boolean(authVal && String(authVal).toLowerCase().startsWith('bearer '));
        }
      }

      const isBmsUrl = url.includes(getBmsApiUrl());

      if (hasBearerAuth || isBmsUrl) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const retryInit = { ...init, _retry: true };
          if (retryInit.headers instanceof Headers) {
            const h = new Headers(retryInit.headers);
            h.set('Authorization', `Bearer ${newToken}`);
            retryInit.headers = h;
          } else if (Array.isArray(retryInit.headers)) {
            const filtered = retryInit.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
            filtered.push(['Authorization', `Bearer ${newToken}`]);
            retryInit.headers = filtered;
          } else {
            retryInit.headers = {
              ...(retryInit.headers || {}),
              Authorization: `Bearer ${newToken}`
            };
          }

          if (input instanceof Request) {
            return originalFetch(new Request(input, retryInit));
          }
          return originalFetch(input, retryInit);
        } else {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }

    return response;
  };
};

// Automatically install the global interceptor in browser environments
installFetchInterceptor();

/* ============================================================
 * Backward Compatibility Layer for Legacy Sochiot Features
 * (Preserves existing imports in AlarmConfig.jsx, Templates.jsx, etc.)
 * ============================================================ */

const EXTERNAL_API_URL = '/sochiot-auth';
const CONFIG_API_URL = '/sochiot-config';
const TRIGGERS_API_URL = '/sochiot-triggers';

const fetchWithTimeout = async (url, options = {}, timeout = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const loginToSochiot = async (email, password) => {
  // First try to obtain Sochiot platform token via the new BMS endpoint
  const platformToken = await getSochiotPlatformToken();
  if (platformToken) {
    localStorage.setItem(LEGACY_SOCHIOT_TOKEN_KEY, platformToken);
    return platformToken;
  }

  // Fallback to legacy auth engine if necessary
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        localStorage.setItem(LEGACY_SOCHIOT_TOKEN_KEY, data.token);
        return data.token;
      }
    }
  } catch (error) {
    console.error('Sochiot Legacy Auth Error:', error);
  }
  return getAccessToken();
};

export const getSochiotUserMe = async () => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${EXTERNAL_API_URL}/user/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Suppress noise
  }
  return getUser();
};

export const getSochiotLocationData = async (locationId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch(`${CONFIG_API_URL}/entity/LOCATION/${locationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch location data');
    return await response.json();
  } catch (error) {
    console.error('Fetch Location Error:', error);
    throw error;
  }
};

export const getSochiotZoneData = async (zoneId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch(`${CONFIG_API_URL}/entity/ZONE/${zoneId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch zone data');
    return await response.json();
  } catch (error) {
    console.error('Fetch Zone Error:', error);
    throw error;
  }
};

export const getSochiotDeviceDetails = async (deviceId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) throw new Error('Failed to fetch device details');
    return await response.json();
  } catch (error) {
    console.error('Fetch Device Details Error:', error);
    throw error;
  }
};

export const getSochiotGatewayStatus = async (clusterId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/gateway/status/uuid/${clusterId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) throw new Error('Failed to fetch gateway status');
    return await response.json();
  } catch (error) {
    console.error('Fetch Gateway Status Error:', error);
    throw error;
  }
};

export const getSochiotDeviceStatus = async (deviceId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/status/uuid/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) throw new Error('Failed to fetch device status');
    return await response.json();
  } catch (error) {
    console.error('Fetch Device Status Error:', error);
    throw error;
  }
};

export const getSochiotRules = async (nodeType, nodeId, page = 1) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${nodeType}/${nodeId}?page=${page}&isPageable=true&sortBy=lastUpdated&sortOrder=DESC`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 10000);
    if (!response.ok) throw new Error('Failed to fetch rules');
    return await response.json();
  } catch (error) {
    console.error('Fetch Rules Error:', error);
    throw error;
  }
};

export const getSochiotRuleById = async (ruleId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 10000);
    if (!response.ok) throw new Error('Failed to fetch rule detail');
    return await response.json();
  } catch (error) {
    console.error('Fetch Rule By ID Error:', error);
    throw error;
  }
};

export const getSochiotEventFields = async (moduleId, moduleTypeId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return [];
  const headers = { 'Authorization': `Bearer ${token}` };
  try {
    const r = await fetchWithTimeout(`${TRIGGERS_API_URL}/fields?moduleId=${moduleId}`, { headers }, 8000);
    if (r.ok) {
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.list || d.content || d.data || []);
      if (arr.length > 0) return arr;
    }
  } catch (e) {}
  if (moduleTypeId) {
    try {
      const r = await fetchWithTimeout(`${CONFIG_API_URL}/module-type/${moduleTypeId}/event-fields`, { headers }, 8000);
      if (r.ok) {
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.list || d.content || d.data || []);
        if (arr.length > 0) return arr;
      }
    } catch (e) {}
  }
  return [];
};

export const getSochiotDeviceModules = async (deviceUuid) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return [];
  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceUuid}/modules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 8000);
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : (data.list || data.content || []);
    }
  } catch (e) { console.error('Fetch Device Modules Error:', e); }
  return [];
};

export const getSochiotDeviceByNumericId = async (deviceNumericId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceNumericId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 10000);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) { console.error('Fetch Device By Numeric ID Error:', e); }
  return null;
};

export const activateSochiotRule = async (ruleId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/activate/${ruleId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Activate Rule Error:', error);
    throw error;
  }
};

export const deactivateSochiotRule = async (ruleId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/de-activate/${ruleId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Deactivate Rule Error:', error);
    throw error;
  }
};

export const deleteSochiotRule = async (ruleId) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }, 20000);
    if (!response.ok) {
      let errorBody = {};
      try { errorBody = await response.json(); } catch (_) {}
      const err = new Error(errorBody?.message || `API Error ${response.status}`);
      err.status = response.status;
      err.body = errorBody;
      throw err;
    }
    return await response.json();
  } catch (error) {
    console.error('Delete Rule Error:', error);
    throw error;
  }
};

export const updateSochiotRule = async (ruleId, payload) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 30000);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Update Rule Error:', error);
    throw error;
  }
};

export const createSochiotRule = async (payload) => {
  const token = localStorage.getItem(SOCHIOT_PLATFORM_TOKEN_KEY) || getAccessToken();
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 30000);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Create Rule Error:', error);
    throw error;
  }
};
