/**
 * Utilitários para detectar ambiente e configurar URLs apropriadas
 */

export const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         window.location.hostname.includes('github.io');
};

export const isGitHubPages = () => {
  return window.location.hostname.includes('github.io');
};

export const getBaseUrl = () => {
  if (isGitHubPages()) {
    // Para GitHub Pages, use o hostname completo com path
    return `${window.location.protocol}//${window.location.host}${window.location.pathname.split('/').slice(0, -1).join('/')}`;
  }
  
  // Para desenvolvimento local ou outros ambientes
  return window.location.origin;
};

export const getRedirectUri = () => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/oauth/callback`;
};

export const getEnvironmentInfo = () => {
  return {
    hostname: window.location.hostname,
    origin: window.location.origin,
    isProduction: isProduction(),
    isGitHubPages: isGitHubPages(),
    baseUrl: getBaseUrl(),
    redirectUri: getRedirectUri(),
  };
};