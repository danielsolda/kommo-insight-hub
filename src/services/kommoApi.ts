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

  // Obter todos os leads com paginação automática melhorada
  async getAllLeads(params: {
    filter?: any;
    with?: string[];
    onProgress?: (loadedCount: number, currentPage: number, totalEstimated?: number) => void;
    maxTimeMinutes?: number; // Limite de tempo em minutos
  } = {}): Promise<{ 
    _embedded: { leads: Lead[] };
    integrity: {
      totalLoaded: number;
      pagesProcessed: number;
      errors: string[];
      timedOut: boolean;
      completedFully: boolean;
    }
  }> {
    const allLeads: Lead[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 250;
    const maxTimeMs = (params.maxTimeMinutes || 15) * 60 * 1000; // Default: 15 minutos
    const startTime = Date.now();
    const errors: string[] = [];
    let consecutiveErrors = 0;
    let timedOut = false;

    console.log(`🔄 Iniciando busca robusta de leads (timeout: ${params.maxTimeMinutes || 15}min)...`);

    while (hasMore && !timedOut) {
      // Verificar timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.warn(`⏰ Timeout atingido após ${Math.round((Date.now() - startTime) / 1000 / 60)}min`);
        timedOut = true;
        break;
      }

      try {
        const response = await this.getLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageLeads = response._embedded?.leads || [];
        allLeads.push(...pageLeads);
        consecutiveErrors = 0; // Reset contador de erros

        console.log(`📄 Página ${currentPage}: ${pageLeads.length} leads carregados (total: ${allLeads.length})`);

        // Callback de progresso com estimativa
        if (params.onProgress) {
          const totalEstimated = pageLeads.length === limit ? 
            Math.ceil(allLeads.length / pageLeads.length) * limit : 
            allLeads.length;
          params.onProgress(allLeads.length, currentPage, totalEstimated);
        }

        // Verificar se há mais páginas
        hasMore = pageLeads.length === limit;
        currentPage++;

        // Rate limiting adaptativo
        if (currentPage % 25 === 0) {
          console.log(`🔄 Pausa estratégica na página ${currentPage}...`);
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
      } catch (error: any) {
        consecutiveErrors++;
        const errorMsg = `Página ${currentPage}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Erro na página ${currentPage}:`, error);

        // Retry logic para falhas temporárias
        if (consecutiveErrors <= 3) {
          console.log(`🔄 Tentativa ${consecutiveErrors}/3 - Aguardando ${consecutiveErrors * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, consecutiveErrors * 2000));
          continue; // Tentar novamente sem incrementar currentPage
        }

        // Se muitos erros consecutivos, parar
        if (consecutiveErrors > 3) {
          console.error(`🛑 Muitos erros consecutivos (${consecutiveErrors}) - parando busca`);
          hasMore = false;
        }
      }
    }

    const completedFully = !timedOut && consecutiveErrors <= 3 && !hasMore;
    
    console.log(`✅ Busca concluída: ${allLeads.length} leads em ${currentPage - 1} páginas`);
    console.log(`📊 Status: ${completedFully ? 'Completa' : 'Parcial'} | Erros: ${errors.length} | Timeout: ${timedOut}`);

    return { 
      _embedded: { leads: allLeads },
      integrity: {
        totalLoaded: allLeads.length,
        pagesProcessed: currentPage - 1,
        errors,
        timedOut,
        completedFully
      }
    };
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

  // Obter todos os leads não organizados com paginação robusta
  async getAllUnsortedLeads(params: {
    filter?: any;
    onProgress?: (loadedCount: number, currentPage: number) => void;
    maxTimeMinutes?: number;
  } = {}): Promise<{ 
    _embedded: { unsorted: any[] };
    integrity: {
      totalLoaded: number;
      pagesProcessed: number;
      errors: string[];
      timedOut: boolean;
      completedFully: boolean;
    }
  }> {
    const allUnsorted: any[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 250;
    const maxTimeMs = (params.maxTimeMinutes || 10) * 60 * 1000;
    const startTime = Date.now();
    const errors: string[] = [];
    let consecutiveErrors = 0;
    let timedOut = false;

    console.log(`🔄 Iniciando busca robusta de leads não organizados (timeout: ${params.maxTimeMinutes || 10}min)...`);

    while (hasMore && !timedOut) {
      if (Date.now() - startTime > maxTimeMs) {
        console.warn(`⏰ Timeout em leads não organizados após ${Math.round((Date.now() - startTime) / 1000 / 60)}min`);
        timedOut = true;
        break;
      }

      try {
        const response = await this.getUnsortedLeads({
          ...params,
          limit,
          page: currentPage
        });

        const pageUnsorted = response._embedded?.unsorted || [];
        allUnsorted.push(...pageUnsorted);
        consecutiveErrors = 0;

        console.log(`📄 Página ${currentPage}: ${pageUnsorted.length} leads não organizados carregados (total: ${allUnsorted.length})`);

        if (params.onProgress) {
          params.onProgress(allUnsorted.length, currentPage);
        }

        hasMore = pageUnsorted.length === limit;
        currentPage++;
        
        // Rate limiting
        if (currentPage % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error: any) {
        consecutiveErrors++;
        const errorMsg = `Página ${currentPage}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Erro na página ${currentPage} (não organizados):`, error);

        if (consecutiveErrors <= 2) {
          console.log(`🔄 Retry ${consecutiveErrors}/2 para leads não organizados...`);
          await new Promise(resolve => setTimeout(resolve, consecutiveErrors * 1500));
          continue;
        }

        console.error(`🛑 Muitos erros em leads não organizados - parando`);
        hasMore = false;
      }
    }

    const completedFully = !timedOut && consecutiveErrors <= 2 && !hasMore;
    
    console.log(`✅ Busca de não organizados concluída: ${allUnsorted.length} leads em ${currentPage - 1} páginas`);
    console.log(`📊 Status: ${completedFully ? 'Completa' : 'Parcial'} | Erros: ${errors.length}`);

    return { 
      _embedded: { unsorted: allUnsorted },
      integrity: {
        totalLoaded: allUnsorted.length,
        pagesProcessed: currentPage - 1,
        errors,
        timedOut,
        completedFully
      }
    };
  }

  // Obter estatísticas completas com validação de integridade (versão otimizada)
  async getStatsWithIntegrity(options: {
    maxTimeMinutes?: number;
    onProgress?: (status: string, progress: number) => void;
  } = {}): Promise<{
    stats: any;
    integrity: {
      totalLeads: number;
      totalUnsorted: number;
      pipelineCounts: Array<{ id: number; name: string; count: number }>;
      missingData: string[];
      dataQuality: number;
      completedFully?: boolean;
      analysisTime?: number;
    };
  }> {
    const { maxTimeMinutes = 2, onProgress } = options;
    console.log(`🔄 Iniciando análise rápida de integridade (máximo ${maxTimeMinutes} min)`);
    
    const startTime = Date.now();
    const maxTime = maxTimeMinutes * 60 * 1000; // Converter para ms
    
    onProgress?.('Carregando pipelines...', 10);
    
    // Buscar pipelines primeiro
    const pipelinesResponse = await this.getPipelines();
    const pipelines = pipelinesResponse._embedded?.pipelines || [];
    
    onProgress?.('Analisando leads organizados...', 30);
    
    // Análise mais leve com timeout menor
    const leadsResult = await this.getAllLeads({
      with: ['contacts'],
      onProgress: (loaded, page, total) => {
        const elapsed = Date.now() - startTime;
        const progress = 30 + Math.min(40, (elapsed / maxTime) * 40);
        onProgress?.(`Carregados ${loaded} leads (página ${page})`, progress);
      },
      maxTimeMinutes: maxTimeMinutes * 0.7 // 70% do tempo para leads organizados
    });
    
    const leads = leadsResult._embedded?.leads || [];
    const totalLeads = leads.length;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.price || 0), 0);
    
    // Verificar se ainda temos tempo
    const elapsed = Date.now() - startTime;
    let unsorted: any[] = [];
    let unsortedResult = { _embedded: { unsorted: [] }, integrity: { completedFully: false, errors: [] } };
    
    if (elapsed < maxTime * 0.8) { // Se ainda temos 20% do tempo
      onProgress?.('Analisando leads não organizados...', 80);
      
      const remainingTime = (maxTime - elapsed) / (60 * 1000); // Tempo restante em minutos
      unsortedResult = await this.getAllUnsortedLeads({
        onProgress: (loaded, page) => {
          const currentProgress = 80 + Math.min(15, (loaded / 1000) * 15);
          onProgress?.(`${loaded} leads não organizados`, currentProgress);
        },
        maxTimeMinutes: Math.max(0.2, remainingTime) // Mínimo 0.2 min
      });
      unsorted = unsortedResult._embedded?.unsorted || [];
    } else {
      console.log('⏰ Tempo insuficiente para análise completa de leads não organizados');
    }
    
    // Validação de integridade por pipeline
    const pipelineCounts = pipelines.map(pipeline => {
      const pipelineLeads = leads.filter(lead => lead.pipeline_id === pipeline.id);
      return {
        id: pipeline.id,
        name: pipeline.name,
        count: pipelineLeads.length
      };
    });

    // Detectar possíveis problemas de dados
    const missingData: string[] = [];
    
    // Verificar leads sem pipeline
    const leadsWithoutPipeline = leads.filter(lead => !lead.pipeline_id);
    if (leadsWithoutPipeline.length > 0) {
      missingData.push(`${leadsWithoutPipeline.length} leads sem pipeline definido`);
    }

    // Verificar leads sem valor
    const leadsWithoutValue = leads.filter(lead => !lead.price || lead.price === 0);
    if (leadsWithoutValue.length > totalLeads * 0.3) { // Mais de 30% sem valor
      missingData.push(`${leadsWithoutValue.length} leads sem valor (${Math.round(leadsWithoutValue.length/totalLeads*100)}%)`);
    }

    // Verificar integridade temporal
    if (!leadsResult.integrity.completedFully) {
      missingData.push('Busca de leads não foi completada totalmente');
    }

    if (!unsortedResult.integrity.completedFully) {
      missingData.push('Busca de leads não organizados incompleta');
    }

    // Calcular score de qualidade de dados
    let qualityScore = 100;
    qualityScore -= leadsResult.integrity.errors.length * 5; // -5 por erro
    qualityScore -= unsortedResult.integrity.errors.length * 3;
    qualityScore -= missingData.length * 10;
    if (!leadsResult.integrity.completedFully) qualityScore -= 20;
    if (!unsortedResult.integrity.completedFully) qualityScore -= 10;
    qualityScore = Math.max(0, qualityScore);

    // Agrupar estatísticas por pipeline
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

    onProgress?.('Finalizando análise...', 95);
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Análise concluída em ${totalTime.toFixed(1)}s: ${totalLeads} leads + ${unsorted.length} não organizados`);
    console.log(`📊 Qualidade dos dados: ${qualityScore}%`);

    onProgress?.('Análise concluída!', 100);

    return {
      stats: {
        totalLeads,
        totalValue,
        pipelines: pipelineStats,
        leads: leads.slice(0, 100), // Primeiros 100 leads para análise
        unsorted: unsorted.slice(0, 50), // Primeiros 50 não organizados
        analysisTime: totalTime,
        partial: elapsed >= maxTime * 0.9 // Indica se foi análise parcial
      },
      integrity: {
        totalLeads,
        totalUnsorted: unsorted.length,
        pipelineCounts,
        missingData,
        dataQuality: qualityScore,
        completedFully: elapsed < maxTime * 0.9,
        analysisTime: totalTime
      }
    };
  }

  // Manter método getStats original para compatibilidade
  async getStats(): Promise<any> {
    const result = await this.getStatsWithIntegrity();
    return result.stats;
  }
}