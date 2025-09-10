/**
 * Utility for cleaning authentication-related URL parameters
 */

export const cleanAuthenticationUrlParams = (): void => {
  const currentUrl = window.location;
  const authParams = ['code', 'state', 'session_state', 'error', 'error_description'];
  
  // Check if URL has any auth parameters
  const hasAuthParams = authParams.some(param => 
    currentUrl.hash.includes(`${param}=`) || currentUrl.search.includes(`${param}=`)
  );
  
  if (hasAuthParams) {
    // Clean hash parameters
    let cleanHash = currentUrl.hash;
    authParams.forEach(param => {
      const hashRegex = new RegExp(`[&#]${param}=[^&#]*`, 'g');
      cleanHash = cleanHash.replace(hashRegex, '');
    });
    
    // Clean search parameters
    const searchParams = new URLSearchParams(currentUrl.search);
    authParams.forEach(param => searchParams.delete(param));
    
    // Build clean URL
    const cleanSearch = searchParams.toString();
    const cleanUrl = currentUrl.pathname + 
                     (cleanSearch ? '?' + cleanSearch : '') + 
                     (cleanHash && cleanHash !== '#' ? cleanHash : '');
    
    // Replace current URL
    window.history.replaceState({}, document.title, cleanUrl);
    console.log('Cleaned authentication parameters from URL');
  }
};

export const hasAuthenticationParams = (): boolean => {
  const currentUrl = window.location;
  const authParams = ['code', 'state', 'session_state'];
  
  // Only return true for successful auth params (code + state), not for errors
  return authParams.some(param => 
    currentUrl.hash.includes(`${param}=`) || currentUrl.search.includes(`${param}=`)
  ) && !currentUrl.hash.includes('error=');
};
