import { KommoAuthService, KommoTokens } from './kommoAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  closed_at?: number;
  price: number;
  contacts?: Contact[];
  custom_fields_values?: CustomField[];
}

export interface Contact {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values?: CustomField[];
}

export interface Pipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  statuses: Status[];
}

export interface Status {
  id: number;
  name: string;
  sort: number;
  pipeline_id: number;
  color: string;
}

export interface CustomField {
  field_id: number;
  field_name: string;
  field_code: string;
  field_type: string;
  values: CustomFieldValue[];
}

export interface CustomFieldValue {
  value: string;
  enum_id?: number;
  enum_code?: string;
}

export class KommoApiService {
  private authService: KommoAuthService;
  private accountUrl: string;

  constructor(authService: KommoAuthService, accountUrl?: string) {
    this.authService = authService;
    this.accountUrl = accountUrl || 'https://api.kommo.com';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const tokens = await this.authService.getValidTokens();
    
    if (!tokens) {
      throw new Error('Não autenticado. Faça login na Kommo.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('kommo-api', {
        body: {
          endpoint,
          method: options.method || 'GET',
          accessToken: tokens.accessToken,
          accountUrl: this.accountUrl,
          body: options.body ? JSON.parse(options.body as string) : undefined
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Erro na função: ${error.message}`);
      }

      if (data?.error) {
        if (data.status === 401) {
          this.authService.clearTokens();
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(data.details || `Erro na API: ${data.status}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in makeRequest:', error);
      throw new Error(error.message || 'Erro ao fazer requisição para API');
    }
  }

  // Obter informações da conta
  async getAccount(): Promise<any> {
    return this.makeRequest('/account');
  }

  // Obter pipelines
  async getPipelines(): Promise<{ _embedded: { pipelines: Pipeline[] } }> {
    return this.makeRequest('/leads/pipelines');
  }

  // Obter campos personalizados
  async getCustomFields(): Promise<{ _embedded: { custom_fields: any[] } }> {
    return this.makeRequest('/leads/custom_fields');
  }

  // Obter leads
  async getLeads(params: {
    limit?: number;
    page?: number;
    filter?: any;
    with?: string[];
  } = {}): Promise<{ _embedded: { leads: Lead[] }, _page: any }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.with) queryParams.set('with', params.with.join(','));
    
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        queryParams.set(`filter[${key}]`, value as string);
      });
    }

    const query = queryParams.toString();
    return this.makeRequest(`/leads${query ? `?${query}` : ''}`);
  }

  // Obter todos os leads com paginação automática
  async getAllLeads(params: {
    filter?: any;
    with?: string[];
    onProgress?: (loadedCount: number, currentPage: number) => void;
  } = {}): Promise<{ _embedded: { leads: Lead[] } }> {
    const allLeads: Lead[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 250; // Máximo por página

    console.log('🔄 Iniciando busca paginada de leads...');

    while (hasMore) {
      try {
        const response = await this.getLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageLeads = response._embedded?.leads || [];
        allLeads.push(...pageLeads);

        console.log(`📄 Página ${currentPage}: ${pageLeads.length} leads carregados`);

        // Callback de progresso
        if (params.onProgress) {
          params.onProgress(allLeads.length, currentPage);
        }

        // Verificar se há mais páginas
        hasMore = pageLeads.length === limit;
        currentPage++;

        // Segurança: evitar loops infinitos - aumentado para contas grandes
        if (currentPage > 500) {
          console.warn('⚠️ Limite de páginas atingido (500) - conta muito grande');
          break;
        }
        
        // Timeout para evitar requests muito longos
        if (currentPage % 50 === 0) {
          console.log(`🔄 Processando página ${currentPage}, aguardando 1s para evitar rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erro na página ${currentPage}:`, error);
        // Continuar mesmo se uma página falhar
        hasMore = false;
      }
    }

    console.log(`✅ Busca concluída: ${allLeads.length} leads carregados em ${currentPage - 1} páginas`);

    return { _embedded: { leads: allLeads } };
  }

  // Obter lead específico
  async getLead(id: number, withContacts: boolean = true): Promise<{ _embedded: { leads: Lead[] } }> {
    const with_param = withContacts ? '?with=contacts' : '';
    return this.makeRequest(`/leads/${id}${with_param}`);
  }

  // Obter contatos
  async getContacts(params: {
    limit?: number;
    page?: number;
    filter?: any;
  } = {}): Promise<{ _embedded: { contacts: Contact[] }, _page: any }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        queryParams.set(`filter[${key}]`, value as string);
      });
    }

    const query = queryParams.toString();
    return this.makeRequest(`/contacts${query ? `?${query}` : ''}`);
  }

  // Obter usuários
  async getUsers(params: { limit?: number; page?: number } = {}): Promise<{ _embedded: { users: any[] }, _page?: any }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    const query = queryParams.toString();
    return this.makeRequest(`/users${query ? `?${query}` : ''}`);
  }

  // Obter todos os usuários com paginação automática
  async getAllUsers(): Promise<{ _embedded: { users: any[] } }> {
    const allUsers: any[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 250;

    console.log('🔄 Iniciando busca paginada de usuários...');

    while (hasMore) {
      try {
        const response = await this.getUsers({ limit, page: currentPage });
        const pageUsers = response._embedded?.users || [];
        allUsers.push(...pageUsers);

        console.log(`📄 Página ${currentPage}: ${pageUsers.length} usuários carregados`);

        hasMore = pageUsers.length === limit;
        currentPage++;

        if (currentPage > 50) {
          console.warn('⚠️ Limite de páginas atingido (50) na listagem de usuários');
          break;
        }
      } catch (error) {
        console.error(`❌ Erro na página ${currentPage} ao buscar usuários:`, error);
        hasMore = false;
      }
    }

    console.log(`✅ Busca de usuários concluída: ${allUsers.length} usuários carregados em ${currentPage - 1} páginas`);

    return { _embedded: { users: allUsers } };
  }

  // Obter leads não organizados (etapa de entrada)
  async getUnsortedLeads(params: {
    limit?: number;
    page?: number;
    filter?: any;
  } = {}): Promise<{ _embedded: { unsorted: any[] }, _page?: any }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        queryParams.set(`filter[${key}]`, value as string);
      });
    }

    const query = queryParams.toString();
    return this.makeRequest(`/leads/unsorted${query ? `?${query}` : ''}`);
  }

  // Obter todos os leads não organizados com paginação automática
  async getAllUnsortedLeads(params: {
    filter?: any;
    onProgress?: (loadedCount: number, currentPage: number) => void;
  } = {}): Promise<{ _embedded: { unsorted: any[] } }> {
    const allUnsorted: any[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 250;

    console.log('🔄 Iniciando busca paginada de leads não organizados...');

    while (hasMore) {
      try {
        const response = await this.getUnsortedLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageUnsorted = response._embedded?.unsorted || [];
        allUnsorted.push(...pageUnsorted);

        console.log(`📄 Página ${currentPage}: ${pageUnsorted.length} leads não organizados carregados`);

        if (params.onProgress) {
          params.onProgress(allUnsorted.length, currentPage);
        }

        hasMore = pageUnsorted.length === limit;
        currentPage++;

        if (currentPage > 500) {
          console.warn('⚠️ Limite de páginas atingido (500) - conta muito grande');
          break;
        }
        
        // Timeout para evitar requests muito longos
        if (currentPage % 50 === 0) {
          console.log(`🔄 Processando página ${currentPage}, aguardando 1s para evitar rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erro na página ${currentPage}:`, error);
        hasMore = false;
      }
    }

    console.log(`✅ Busca de não organizados concluída: ${allUnsorted.length} leads em ${currentPage - 1} páginas`);

    return { _embedded: { unsorted: allUnsorted } };
  }

  // Obter estatísticas básicas
  async getStats(): Promise<any> {
    const [leadsResponse, pipelinesResponse] = await Promise.all([
      this.getLeads({ limit: 250 }),
      this.getPipelines()
    ]);

    const leads = leadsResponse._embedded?.leads || [];
    const pipelines = pipelinesResponse._embedded?.pipelines || [];

    // Calcular estatísticas
    const totalLeads = leads.length;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.price || 0), 0);
    
    // Agrupar por pipeline/status
    const pipelineStats = pipelines.map(pipeline => {
      const pipelineLeads = leads.filter(lead => lead.pipeline_id === pipeline.id);
      const statusStats = pipeline.statuses.map(status => {
        const statusLeads = pipelineLeads.filter(lead => lead.status_id === status.id);
        return {
          ...status,
          count: statusLeads.length,
          value: statusLeads.reduce((sum, lead) => sum + (lead.price || 0), 0)
        };
      });
      
      return {
        ...pipeline,
        totalLeads: pipelineLeads.length,
        totalValue: pipelineLeads.reduce((sum, lead) => sum + (lead.price || 0), 0),
        statuses: statusStats
      };
    });

    return {
      totalLeads,
      totalValue,
      pipelines: pipelineStats,
      leads: leads.slice(0, 50) // Limitar para performance
    };
  }
}