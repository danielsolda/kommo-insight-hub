/**
 * Cache Manager for Kommo API data
 * Centralizes cache clearing logic to ensure data consistency when switching accounts
 */

const CACHE_PREFIXES = ['kommo-api-', 'kommo-'];

/**
 * Clears all Kommo-related cache entries from localStorage
 */
export const clearAllKommoCache = (): void => {
  const keysToRemove: string[] = [];
  
  // Find all cache keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const shouldClear = CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
      if (shouldClear) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove all found cache keys
  keysToRemove.forEach(key => {
    console.log(`🗑️ Clearing cache: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log(`✅ Cleared ${keysToRemove.length} cache entries`);
};

/**
 * Gets the current active account ID from localStorage
 */
export const getActiveAccountId = (): string | null => {
  try {
    const config = localStorage.getItem('kommoConfig');
    if (!config) return null;
    
    const parsed = JSON.parse(config);
    // Use integration ID + account URL as unique identifier
    return `${parsed.integrationId}-${parsed.accountUrl || 'default'}`;
  } catch {
    return null;
  }
};

/**
 * Stores the active account ID for change detection
 */
export const setStoredAccountId = (accountId: string): void => {
  localStorage.setItem('kommo-active-account-id', accountId);
};

/**
 * Gets the previously stored account ID
 */
export const getStoredAccountId = (): string | null => {
  return localStorage.getItem('kommo-active-account-id');
};

/**
 * Checks if the account has changed and clears cache if needed
 * Returns true if cache was cleared
 */
export const checkAndClearCacheIfAccountChanged = (): boolean => {
  const currentAccountId = getActiveAccountId();
  const storedAccountId = getStoredAccountId();
  
  if (!currentAccountId) return false;
  
  if (storedAccountId && storedAccountId !== currentAccountId) {
    console.log(`🔄 Account changed from ${storedAccountId} to ${currentAccountId}`);
    clearAllKommoCache();
    setStoredAccountId(currentAccountId);
    return true;
  }
  
  if (!storedAccountId) {
    setStoredAccountId(currentAccountId);
  }
  
  return false;
};
