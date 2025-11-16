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

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface User {
  id: number;
  name: string;
}

export interface Note {
  id: number;
  entity_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  responsible_user_id: number;
  note_type: string;
  params?: {
    text?: string;
    duration?: number;
    phone?: string;
  };
}

export interface Event {
  id: string;
  type: string;
  entity_id: number;
  entity_type: string;
  created_by: number;
  created_at: number;
  value_after?: any;
  value_before?: any;
  account_id?: number;
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

  // Obter todas as tags
  async getTags(): Promise<{ _embedded: { tags: Tag[] } }> {
    return this.makeRequest('/leads/tags');
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
        if (Array.isArray(value)) {
          // Support multiple filter values like filter[id]=1&filter[id]=2
          value.forEach((v) => queryParams.append(`filter[${key}]`, String(v)));
        } else if (value !== undefined && value !== null) {
          queryParams.set(`filter[${key}]`, String(value));
        }
      });
    }

    const query = queryParams.toString();
    return this.makeRequest(`/leads${query ? `?${query}` : ''}`);
  }

  // Obter leads por IDs específicos (útil para hidratar tags)
  async getLeadsByIds(ids: Array<number | string>, withParams: string[] = ['tags']): Promise<{ _embedded: { leads: Lead[] } }> {
    const response = await this.getLeads({
      filter: { id: ids },
      with: withParams,
      limit: 250
    });
    return { _embedded: { leads: response._embedded?.leads || [] } };
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
    const limit = 250;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    let retryDelay = 1000; // Start with 1 second

    console.log('🔄 Iniciando busca paginada de leads...');

    while (hasMore) {
      const startTime = Date.now();
      
      try {
        const response = await this.getLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageLeads = response._embedded?.leads || [];
        const requestTime = Date.now() - startTime;
        
        console.log(`📄 Página ${currentPage}: ${pageLeads.length} leads (${requestTime}ms)`);

        // Reset failure counter on success
        consecutiveFailures = 0;
        retryDelay = 1000;

        // Multiple checks for end of pagination
        const isEmptyPage = pageLeads.length === 0;
        const isPartialPage = pageLeads.length < limit;
        const hasPageInfo = response._page;
        
        if (isEmptyPage) {
          console.log('📭 Página vazia encontrada - fim da paginação');
          hasMore = false;
          break;
        }

        allLeads.push(...pageLeads);

        if (params.onProgress) {
          params.onProgress(allLeads.length, currentPage);
        }

        // Enhanced pagination detection
        if (isPartialPage) {
          console.log(`📄 Página parcial (${pageLeads.length}/${limit}) - provavelmente última página`);
          hasMore = false;
        } else if (hasPageInfo && hasPageInfo.count && hasPageInfo.count < limit) {
          console.log('📄 Metadados indicam fim da paginação');
          hasMore = false;
        }

        currentPage++;

        // Safety limits with better messaging
        if (currentPage > 1000) {
          console.warn('⚠️ Limite de segurança atingido (1000 páginas) - parando carregamento');
          break;
        }

        // Smart rate limiting based on response time
        let delayTime = 500; // Base delay
        if (requestTime > 3000) {
          delayTime = 2000; // Slow responses need more delay
        } else if (requestTime < 500) {
          delayTime = 200; // Fast responses can go faster
        }

        // Extra delay every 100 pages
        if (currentPage % 100 === 0) {
          delayTime += 3000;
          console.log(`🔄 Checkpoint página ${currentPage}, delay extra: ${delayTime}ms`);
        }

        if (hasMore && delayTime > 0) {
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }

      } catch (error: any) {
        consecutiveFailures++;
        const errorMessage = error.message || error.toString();
        
        console.error(`❌ Erro na página ${currentPage} (tentativa ${consecutiveFailures}):`, errorMessage);

        // Retry logic with exponential backoff
        if (consecutiveFailures <= maxConsecutiveFailures) {
          console.log(`🔄 Tentando novamente em ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
          continue; // Retry the same page
        } else {
          console.error(`💀 Muitas falhas consecutivas (${consecutiveFailures}) - parando carregamento`);
          hasMore = false;
        }
      }
    }

    console.log(`✅ Busca concluída: ${allLeads.length} leads em ${currentPage - 1} páginas`);
    
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
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    let retryDelay = 1000;

    console.log('🔄 Iniciando busca paginada de leads não organizados...');

    while (hasMore) {
      const startTime = Date.now();
      
      try {
        const response = await this.getUnsortedLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageUnsorted = response._embedded?.unsorted || [];
        const requestTime = Date.now() - startTime;
        
        console.log(`📄 Página ${currentPage}: ${pageUnsorted.length} não organizados (${requestTime}ms)`);

        consecutiveFailures = 0;
        retryDelay = 1000;

        const isEmptyPage = pageUnsorted.length === 0;
        const isPartialPage = pageUnsorted.length < limit;
        
        if (isEmptyPage) {
          console.log('📭 Página vazia encontrada - fim da paginação');
          hasMore = false;
          break;
        }

        allUnsorted.push(...pageUnsorted);

        if (params.onProgress) {
          params.onProgress(allUnsorted.length, currentPage);
        }

        if (isPartialPage) {
          console.log(`📄 Página parcial (${pageUnsorted.length}/${limit}) - última página`);
          hasMore = false;
        }

        currentPage++;

        if (currentPage > 1000) {
          console.warn('⚠️ Limite de segurança atingido (1000 páginas) - parando carregamento');
          break;
        }

        // Smart delay based on response time
        let delayTime = 500;
        if (requestTime > 3000) {
          delayTime = 2000;
        } else if (requestTime < 500) {
          delayTime = 200;
        }

        if (currentPage % 100 === 0) {
          delayTime += 3000;
          console.log(`🔄 Checkpoint página ${currentPage}, delay extra: ${delayTime}ms`);
        }

        if (hasMore && delayTime > 0) {
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }

      } catch (error: any) {
        consecutiveFailures++;
        console.error(`❌ Erro na página ${currentPage} (tentativa ${consecutiveFailures}):`, error.message || error);

        if (consecutiveFailures <= maxConsecutiveFailures) {
          console.log(`🔄 Tentando novamente em ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2;
          continue;
        } else {
          console.error(`💀 Muitas falhas consecutivas - parando carregamento`);
          hasMore = false;
        }
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

  // Buscar notas de um lead específico
  async getLeadNotes(leadId: number, params: {
    limit?: number;
    page?: number;
  } = {}): Promise<{ _embedded: { notes: Note[] }, _page?: any }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    queryParams.set('filter[entity_id]', leadId.toString());
    
    const query = queryParams.toString() ? `?${queryParams}` : '';
    return this.makeRequest(`/api/v4/leads/notes${query}`);
  }

  // Buscar todas as notas com filtro
  async getNotes(params: {
    limit?: number;
    page?: number;
    filter?: {
      entity_id?: number[];
      created_at?: { from: number; to: number };
    };
  } = {}): Promise<{ _embedded: { notes: Note[] }, _page?: any }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    
    if (params.filter?.entity_id) {
      queryParams.set('filter[entity_id]', params.filter.entity_id.join(','));
    }
    
    const query = queryParams.toString() ? `?${queryParams}` : '';
    return this.makeRequest(`/api/v4/leads/notes${query}`);
  }

  // Buscar eventos (mensagens, ligações, e-mails, SMS)
  async getEvents(params: {
    filter?: {
      entity?: string[];
      type?: string[];
      created_at?: { from: number; to: number };
    };
    limit?: number;
    page?: number;
  } = {}): Promise<{ _embedded: { events: Event[] }, _page?: any }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    
    if (params.filter?.entity) {
      params.filter.entity.forEach(e => queryParams.append('filter[entity][]', e));
    }
    
    if (params.filter?.type) {
      params.filter.type.forEach(t => queryParams.append('filter[type][]', t));
    }
    
    if (params.filter?.created_at) {
      queryParams.set('filter[created_at][from]', params.filter.created_at.from.toString());
      queryParams.set('filter[created_at][to]', params.filter.created_at.to.toString());
    }
    
    const query = queryParams.toString() ? `?${queryParams}` : '';
    return this.makeRequest(`/api/v4/events${query}`);
  }
}