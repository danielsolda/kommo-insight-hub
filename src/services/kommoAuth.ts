export interface KommoConfig {
  integrationId: string;
  secretKey: string;
  redirectUri: string;
  accountUrl?: string;
}

export interface KommoTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  expiresAt: number;
}

export class KommoAuthService {
  private config: KommoConfig;

  constructor(config: KommoConfig) {
    this.config = config;
  }

  // Gerar URL de autorização OAuth
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.integrationId,
      mode: 'post_message'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://www.kommo.com/oauth?${params.toString()}`;
  }

  // Trocar código de autorização por tokens
  async exchangeCodeForTokens(code: string): Promise<KommoTokens> {
    const response = await fetch('https://askrsvzzfesdchyfvcpv.supabase.co/functions/v1/kommo-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'exchange_code',
        code,
        client_id: this.config.integrationId,
        client_secret: this.config.secretKey,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        account_url: this.config.accountUrl
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao trocar código por tokens');
    }

    const data = await response.json();
    
    // Calcular timestamp de expiração
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      expiresAt
    };
  }

  // Atualizar token de acesso
  async refreshAccessToken(refreshToken: string): Promise<KommoTokens> {
    const response = await fetch('https://askrsvzzfesdchyfvcpv.supabase.co/functions/v1/kommo-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'refresh_token',
        client_id: this.config.integrationId,
        client_secret: this.config.secretKey,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        account_url: this.config.accountUrl
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar token');
    }

    const data = await response.json();
    
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      expiresAt
    };
  }

  // Verificar se o token está válido
  isTokenValid(tokens: KommoTokens): boolean {
    return Date.now() < tokens.expiresAt - 60000; // 1 minuto de margem
  }

  // Salvar tokens no localStorage
  saveTokens(tokens: KommoTokens): void {
    localStorage.setItem('kommoTokens', JSON.stringify(tokens));
  }

  // Carregar tokens do localStorage
  loadTokens(): KommoTokens | null {
    const saved = localStorage.getItem('kommoTokens');
    return saved ? JSON.parse(saved) : null;
  }

  // Remover tokens
  clearTokens(): void {
    localStorage.removeItem('kommoTokens');
  }

  // Obter tokens válidos (atualiza se necessário)
  async getValidTokens(): Promise<KommoTokens | null> {
    const tokens = this.loadTokens();
    
    if (!tokens) {
      return null;
    }

    if (this.isTokenValid(tokens)) {
      return tokens;
    }

    try {
      const newTokens = await this.refreshAccessToken(tokens.refreshToken);
      this.saveTokens(newTokens);
      return newTokens;
    } catch (error) {
      this.clearTokens();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }
}