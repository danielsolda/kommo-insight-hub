/**
 * Utilitários para detectar ambiente e configurar URLs apropriadas
 */

export const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         window.location.hostname.includes('github.io');
};

export const isGitHubPages = () => {
  const hostname = window.location.hostname;
  console.log('Current hostname:', hostname);
  const isGitHub = hostname.includes('github.io');
  console.log('Is GitHub Pages:', isGitHub);
  return isGitHub;
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

/**
 * Detecta a conta Kommo atual a partir do referrer ou URL
 */
export const detectCurrentKommoAccount = () => {
  try {
    // 1. Verificar referrer (quando vem do painel Kommo)
    if (document.referrer && document.referrer.includes('.kommo.com')) {
      const referrerUrl = new URL(document.referrer);
      const subdomain = referrerUrl.hostname.split('.')[0];
      return {
        accountUrl: `https://${referrerUrl.hostname}`,
        subdomain,
        source: 'referrer'
      };
    }

    // 2. Verificar URL parameter 'referer'
    const urlParams = new URLSearchParams(window.location.search);
    const referer = urlParams.get('referer');
    if (referer && referer.includes('.kommo.com')) {
      const refererUrl = new URL(referer);
      const subdomain = refererUrl.hostname.split('.')[0];
      return {
        accountUrl: `https://${refererUrl.hostname}`,
        subdomain,
        source: 'url_param'
      };
    }

    // 3. Fallback para config salvo
    const savedConfig = localStorage.getItem('kommoConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.accountUrl) {
        const configUrl = new URL(config.accountUrl);
        const subdomain = configUrl.hostname.split('.')[0];
        return {
          accountUrl: config.accountUrl,
          subdomain,
          source: 'saved_config'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao detectar conta Kommo:', error);
    return null;
  }
};

/**
 * Atualiza a configuração com a conta detectada
 */
export const updateKommoAccountIfChanged = () => {
  const detected = detectCurrentKommoAccount();
  if (!detected) return null;

  // Verificar se mudou de conta
  const lastAccount = localStorage.getItem('lastKommoAccount');
  const savedConfig = localStorage.getItem('kommoConfig');
  
  if (lastAccount && lastAccount !== detected.subdomain) {
    console.log('🔄 Mudança de conta detectada:', lastAccount, '->', detected.subdomain);
    
    // Limpar dados da conta anterior
    const oldNamespace = lastAccount;
    Object.keys(localStorage).forEach(key => {
      if (key.includes(`kommo-api_${oldNamespace}-`) || 
          key.includes(`kommoTokens_${oldNamespace}`) ||
          key.includes(`kommo_${oldNamespace}-`)) {
        localStorage.removeItem(key);
        console.log('🗑️ Cache antigo removido:', key);
      }
    });
  }

  // Atualizar configuração se necessário
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    if (config.accountUrl !== detected.accountUrl) {
      config.accountUrl = detected.accountUrl;
      localStorage.setItem('kommoConfig', JSON.stringify(config));
      console.log('📝 Configuração atualizada com nova conta:', detected.accountUrl);
    }
  }

  // Salvar conta atual
  localStorage.setItem('lastKommoAccount', detected.subdomain);
  
  return detected;
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