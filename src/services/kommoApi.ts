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
  async getUsers(): Promise<{ _embedded: { users: any[] } }> {
    return this.makeRequest('/users');
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