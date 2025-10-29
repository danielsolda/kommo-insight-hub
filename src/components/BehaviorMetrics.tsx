import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Cell, Dot } from "recharts";
import { TrendingUp, Clock, Target, Zap } from "lucide-react";
import { Pipeline, User, Lead } from "@/services/kommoApi";
import { LeadListDialog } from "./LeadListDialog";

interface BehaviorMetricsProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  users: User[];
  selectedPipeline: number | null;
  selectedUser: number | null;
  timeFrame: string;
}

export const BehaviorMetrics = ({ 
  allLeads, 
  pipelines, 
  users, 
  selectedPipeline, 
  selectedUser, 
  timeFrame 
}: BehaviorMetricsProps) => {
  console.log("BehaviorMetrics rendering:", { allLeads: allLeads?.length, pipelines: pipelines?.length, users: users?.length });
  
  const [selectedActivity, setSelectedActivity] = useState<{
    day: string;
    type: 'created' | 'updated' | 'closed';
    leads: Lead[];
  } | null>(null);
  
  if (!allLeads || !pipelines || !users) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Dados não disponíveis</p>
      </div>
    );
  }
  
  // Calculate velocity metrics
  const velocityData = useMemo(() => {
    const now = Date.now();
    const timeFrameMs = parseInt(timeFrame) * 24 * 60 * 60 * 1000;
    const startTime = now - timeFrameMs;

    const filteredLeads = allLeads.filter(lead => {
      const leadTime = lead.created_at * 1000;
      if (leadTime < startTime) return false;
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    // Group by status and calculate average time
    const statusMap = new Map();
    
    pipelines.forEach(pipeline => {
      if (selectedPipeline && pipeline.id !== selectedPipeline) return;
      
      pipeline.statuses.forEach(status => {
        statusMap.set(status.id, {
          name: status.name,
          color: status.color,
          leads: [],
          totalTime: 0,
          count: 0
        });
      });
    });

    filteredLeads.forEach(lead => {
      const status = statusMap.get(lead.status_id);
      if (status) {
        const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
        const daysSinceUpdate = typeof lead.updated_at === 'number'
          ? (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000)
          : daysSinceCreated;
        
        status.leads.push(lead);
        status.totalTime += daysSinceUpdate;
        status.count++;
      }
    });

    return Array.from(statusMap.values())
      .filter(status => status.count > 0)
      .map(status => ({
        name: status.name.length > 15 ? status.name.substring(0, 15) + '...' : status.name,
        fullName: status.name,
        avgDays: status.totalTime / status.count,
        leadCount: status.count,
        color: status.color || '#8884d8'
      }))
      .sort((a, b) => b.avgDays - a.avgDays);
  }, [allLeads, pipelines, selectedPipeline, selectedUser, timeFrame]);

  // Calculate conversion funnel
  const conversionFunnelData = useMemo(() => {
    const pipeline = selectedPipeline ? 
      pipelines.find(p => p.id === selectedPipeline) : 
      pipelines.find(p => p.is_main) || pipelines[0];
    
    if (!pipeline) return [];

    const statusOrder = pipeline.statuses.sort((a, b) => a.sort - b.sort);
    
    const now = Date.now();
    const timeFrameMs = parseInt(timeFrame) * 24 * 60 * 60 * 1000;
    const startTime = now - timeFrameMs;

    const filteredLeads = allLeads.filter(lead => {
      const leadTime = lead.created_at * 1000;
      if (leadTime < startTime) return false;
      if (lead.pipeline_id !== pipeline.id) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    return statusOrder.map((status, index) => {
      const leadsInStatus = filteredLeads.filter(lead => lead.status_id === status.id);
      const previousStatusLeads = index === 0 ? filteredLeads.length : 
        filteredLeads.filter(lead => 
          statusOrder.slice(0, index + 1).some(s => s.id === lead.status_id)
        ).length;
      
      const conversionRate = previousStatusLeads > 0 ? (leadsInStatus.length / previousStatusLeads) * 100 : 0;
      
      return {
        name: status.name.length > 12 ? status.name.substring(0, 12) + '...' : status.name,
        fullName: status.name,
        count: leadsInStatus.length,
        conversionRate: conversionRate,
        color: status.color || '#8884d8'
      };
    });
  }, [allLeads, pipelines, selectedPipeline, selectedUser, timeFrame]);

  // Calculate engagement scatter plot data
  const engagementData = useMemo(() => {
    const now = Date.now();
    const timeFrameMs = parseInt(timeFrame) * 24 * 60 * 60 * 1000;
    const startTime = now - timeFrameMs;

    const filteredLeads = allLeads.filter(lead => {
      const leadTime = lead.created_at * 1000;
      if (leadTime < startTime) return false;
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true; // Include all leads (active and closed)
    });

    return filteredLeads.map(lead => {
      const daysSinceCreated = Math.max(0, (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000));
      const daysSinceUpdate = typeof lead.updated_at === 'number'
        ? Math.max(0, (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000))
        : daysSinceCreated;
      const value = Math.max(1000, lead.price || 1000); // Minimum value for visibility
      
      return {
        x: Math.round(daysSinceCreated * 10) / 10, // Round for better grouping
        y: Math.round(daysSinceUpdate * 10) / 10,
        z: value,
        name: lead.name,
        status: lead.status_id,
        isClosed: !!lead.closed_at
      };
    });
  }, [allLeads, selectedPipeline, selectedUser, timeFrame]);

  // Calculate time analysis by day of week with detailed lead tracking
  const weeklyActivityData = useMemo(() => {
    const now = Date.now();
    const timeFrameMs = parseInt(timeFrame) * 24 * 60 * 60 * 1000;
    const startTime = now - timeFrameMs;

    const filteredLeads = allLeads.filter(lead => {
      const leadTime = lead.created_at * 1000;
      if (leadTime < startTime) return false;
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const activityByDay = new Array(7).fill(0).map((_, index) => ({
      day: weekdays[index],
      created: 0,
      updated: 0,
      closed: 0,
      createdLeads: [] as Lead[],
      updatedLeads: [] as Lead[],
      closedLeads: [] as Lead[]
    }));

    filteredLeads.forEach(lead => {
      const createdIndex = Number.isFinite(lead.created_at) ? new Date(lead.created_at * 1000).getDay() : null;
      if (createdIndex !== null && activityByDay[createdIndex]) {
        activityByDay[createdIndex].created++;
        activityByDay[createdIndex].createdLeads.push(lead);
      }

      if (typeof lead.updated_at === 'number') {
        const updatedIndex = new Date(lead.updated_at * 1000).getDay();
        if (activityByDay[updatedIndex]) {
          activityByDay[updatedIndex].updated++;
          activityByDay[updatedIndex].updatedLeads.push(lead);
        }
      }
      
      if (typeof lead.closed_at === 'number') {
        const closedIndex = new Date(lead.closed_at * 1000).getDay();
        if (activityByDay[closedIndex]) {
          activityByDay[closedIndex].closed++;
          activityByDay[closedIndex].closedLeads.push(lead);
        }
      }
    });

    return activityByDay;
  }, [allLeads, selectedPipeline, selectedUser, timeFrame]);

  const handleDotClick = (data: any, type: 'created' | 'updated' | 'closed') => {
    if (!data || !data.day) return;
    
    const dayData = weeklyActivityData.find(d => d.day === data.day);
    
    if (dayData) {
      const leadsForType = type === 'created' ? dayData.createdLeads :
                          type === 'updated' ? dayData.updatedLeads :
                          dayData.closedLeads;
      
      setSelectedActivity({
        day: dayData.day,
        type: type,
        leads: leadsForType
      });
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'avgDays') {
      return [`${value.toFixed(1)} dias`, 'Tempo Médio'];
    }
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Velocity by Status */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Médio por Status
          </CardTitle>
          <CardDescription>
            Análise do tempo que os leads permanecem em cada etapa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={formatTooltip}
                  labelFormatter={(label) => velocityData.find(d => d.name === label)?.fullName || label}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="avgDays" name="avgDays" radius={[4, 4, 0, 0]}>
                  {velocityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Funil de Conversão
          </CardTitle>
          <CardDescription>
            Taxa de conversão entre cada etapa do pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionFunnelData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? `${value} leads` : `${typeof value === 'number' ? value.toFixed(1) : value}%`,
                    name === 'count' ? 'Quantidade' : 'Taxa de Conversão'
                  ]}
                  labelFormatter={(label) => conversionFunnelData.find(d => d.name === label)?.fullName || label}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" name="count" radius={[4, 4, 0, 0]}>
                  {conversionFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity Pattern */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Padrão de Atividade Semanal
          </CardTitle>
          <CardDescription>
            Distribuição de atividades por dia da semana • Clique em qualquer ponto para ver os leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyActivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  content={(props) => {
                    if (props.active && props.payload && props.payload.length) {
                      return (
                        <div style={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          padding: '8px 12px'
                        }}>
                          <p className="text-sm font-medium">{props.label}</p>
                          {props.payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {entry.value}
                            </p>
                          ))}
                          <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="hsl(var(--primary))" 
                  name="Criados" 
                  strokeWidth={2}
                  dot={(props: any) => (
                    <Dot
                      {...props}
                      r={5}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'created')}
                    />
                  )}
                  activeDot={(props: any) => (
                    <Dot
                      {...props}
                      r={8}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'created')}
                    />
                  )}
                />
                <Line 
                  type="monotone" 
                  dataKey="updated" 
                  stroke="hsl(var(--success))" 
                  name="Atualizados" 
                  strokeWidth={2}
                  dot={(props: any) => (
                    <Dot
                      {...props}
                      r={5}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'updated')}
                    />
                  )}
                  activeDot={(props: any) => (
                    <Dot
                      {...props}
                      r={8}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'updated')}
                    />
                  )}
                />
                <Line 
                  type="monotone" 
                  dataKey="closed" 
                  stroke="hsl(var(--warning))" 
                  name="Fechados" 
                  strokeWidth={2}
                  dot={(props: any) => (
                    <Dot
                      {...props}
                      r={5}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'closed')}
                    />
                  )}
                  activeDot={(props: any) => (
                    <Dot
                      {...props}
                      r={8}
                      cursor="pointer"
                      onClick={() => handleDotClick(props.payload, 'closed')}
                    />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Análise de Engajamento
          </CardTitle>
          <CardDescription>
            Relação entre idade do lead, última atividade e valor (tamanho da bolha)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Dias desde criação" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Dias desde última atividade" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name, props) => {
                    if (name === 'x') return [`${value} dias`, 'Dias desde criação'];
                    if (name === 'y') return [`${value} dias`, 'Dias desde última atividade'];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.name} - R$ ${(data.z / 1000).toFixed(0)}k ${data.isClosed ? '(Fechado)' : '(Ativo)'}`;
                    }
                    return label;
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Scatter data={engagementData}>
                  {engagementData.map((entry, index) => {
                    // Calculate bubble size based on value (z)
                    const minSize = 4;
                    const maxSize = 20;
                    const maxValue = Math.max(...engagementData.map(d => d.z));
                    const size = minSize + ((entry.z / maxValue) * (maxSize - minSize));
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        r={size}
                        fill={
                          entry.isClosed ? "hsl(var(--muted-foreground))" :
                          entry.y <= 2 ? "hsl(var(--success))" : 
                          entry.y <= 7 ? "hsl(var(--warning))" : 
                          "hsl(var(--destructive))"
                        }
                        fillOpacity={entry.isClosed ? 0.4 : 0.8}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lead List Dialog */}
      {selectedActivity && (
        <LeadListDialog
          open={!!selectedActivity}
          onOpenChange={(open) => !open && setSelectedActivity(null)}
          leads={selectedActivity.leads}
          day={selectedActivity.day}
          type={selectedActivity.type}
          users={users}
        />
      )}
    </div>
  );
};