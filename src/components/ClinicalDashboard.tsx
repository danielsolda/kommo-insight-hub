import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, CalendarX, Repeat, Syringe, Settings, Users, Activity } from "lucide-react";
import { MetricsSkeleton } from "@/components/ui/MetricsSkeleton";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { ClinicalConfigModal } from "@/components/ClinicalConfigModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pipeline, Lead, CustomField, Event } from "@/services/kommoApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface ClinicalDashboardProps {
  pipelines: Pipeline[];
  allLeads: Lead[];
  customFields: CustomField[];
  events: Event[];
  loading: boolean;
  credentialId: string;
  onFetchEvents: () => void;
}

interface ClinicalConfig {
  scheduled_pipeline_id: number | null;
  scheduled_status_id: number | null;
  completed_pipeline_id: number | null;
  completed_status_id: number | null;
  rescheduled_pipeline_id: number | null;
  rescheduled_status_id: number | null;
  procedure_pipeline_id: number | null;
  procedure_status_id: number | null;
  doctor_custom_field_id: number | null;
  procedure_custom_field_id: number | null;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
];

export const ClinicalDashboard = ({
  pipelines,
  allLeads,
  customFields,
  events,
  loading,
  credentialId,
  onFetchEvents,
}: ClinicalDashboardProps) => {
  const { user } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const [clinicalConfig, setClinicalConfig] = useState<ClinicalConfig | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadClinicalConfig();
  }, [user, credentialId]);

  useEffect(() => {
    if (events.length === 0) {
      onFetchEvents();
    }
  }, []);

  const loadClinicalConfig = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("clinical_config")
      .select("*")
      .eq("user_id", user.id)
      .eq("credential_id", credentialId)
      .maybeSingle();
    
    if (data) {
      setClinicalConfig(data);
    }
  };

  // Count leads that moved into a specific status via events
  const countLeadsInStatus = (pipelineId: number | null, statusId: number | null): number => {
    if (!pipelineId || !statusId) return 0;
    
    // Count leads currently in this status
    return allLeads.filter(
      (lead) => lead.pipeline_id === pipelineId && lead.status_id === statusId
    ).length;
  };

  // Also count from events (leads that passed through)
  const countLeadsFromEvents = (pipelineId: number | null, statusId: number | null): number => {
    if (!pipelineId || !statusId) return 0;
    
    // Count unique leads that had events moving them to this status
    const leadIds = new Set<number>();
    events.forEach((event) => {
      if (
        event.type === "lead_status_changed" &&
        event.value_after?.lead_status?.pipeline_id === pipelineId &&
        event.value_after?.lead_status?.id === statusId
      ) {
        leadIds.add(event.entity_id);
      }
    });

    // Also count leads currently in the status
    allLeads.forEach((lead) => {
      if (lead.pipeline_id === pipelineId && lead.status_id === statusId) {
        leadIds.add(lead.id);
      }
    });

    return leadIds.size;
  };

  const metrics = useMemo(() => {
    if (!clinicalConfig) return null;
    
    const scheduled = countLeadsFromEvents(clinicalConfig.scheduled_pipeline_id, clinicalConfig.scheduled_status_id);
    const completed = countLeadsFromEvents(clinicalConfig.completed_pipeline_id, clinicalConfig.completed_status_id);
    const rescheduled = countLeadsFromEvents(clinicalConfig.rescheduled_pipeline_id, clinicalConfig.rescheduled_status_id);
    const procedures = countLeadsFromEvents(clinicalConfig.procedure_pipeline_id, clinicalConfig.procedure_status_id);

    return { scheduled, completed, rescheduled, procedures };
  }, [clinicalConfig, allLeads, events]);

  // Get doctor conversion data
  const doctorData = useMemo(() => {
    if (!clinicalConfig?.doctor_custom_field_id) return [];

    const doctorMap = new Map<string, { total: number; converted: number }>();

    allLeads.forEach((lead) => {
      const doctorField = lead.custom_fields_values?.find(
        (f) => f.field_id === clinicalConfig.doctor_custom_field_id
      );
      if (!doctorField?.values?.[0]?.value) return;

      const doctorName = doctorField.values[0].value;
      const current = doctorMap.get(doctorName) || { total: 0, converted: 0 };
      current.total++;

      // Consider "converted" if lead reached procedure status
      if (
        clinicalConfig.procedure_pipeline_id &&
        clinicalConfig.procedure_status_id &&
        lead.pipeline_id === clinicalConfig.procedure_pipeline_id &&
        lead.status_id === clinicalConfig.procedure_status_id
      ) {
        current.converted++;
      }

      doctorMap.set(doctorName, current);
    });

    return Array.from(doctorMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        converted: data.converted,
        rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [clinicalConfig, allLeads]);

  // Get procedure breakdown data
  const procedureData = useMemo(() => {
    if (!clinicalConfig?.procedure_custom_field_id) return [];

    const procedureMap = new Map<string, number>();

    allLeads.forEach((lead) => {
      const procField = lead.custom_fields_values?.find(
        (f) => f.field_id === clinicalConfig.procedure_custom_field_id
      );
      if (!procField?.values?.[0]?.value) return;

      const procName = procField.values[0].value;
      procedureMap.set(procName, (procedureMap.get(procName) || 0) + 1);
    });

    return Array.from(procedureMap.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [clinicalConfig, allLeads]);

  const totalProcedures = procedureData.reduce((sum, p) => sum + p.value, 0);

  if (!clinicalConfig) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Settings className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Configure o Dashboard Clínico</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Mapeie as etapas do seu funil para consultas agendadas, realizadas, remarcadas e procedimentos.
              Selecione também os campos personalizados de médico e procedimento.
            </p>
            <Button onClick={() => setConfigOpen(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurar Agora
            </Button>
          </CardContent>
        </Card>

        <ClinicalConfigModal
          open={configOpen}
          onOpenChange={setConfigOpen}
          pipelines={pipelines}
          customFields={customFields}
          credentialId={credentialId}
          onSave={loadClinicalConfig}
        />
      </div>
    );
  }

  if (loading) {
    return <MetricsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Config button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configurações Clínicas
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Consultas Agendadas</p>
            <div className="p-2 rounded-lg bg-info/20">
              <CalendarCheck className="h-5 w-5 text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.scheduled || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Consultas Realizadas</p>
            <div className="p-2 rounded-lg bg-success/20">
              <CalendarCheck className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.completed || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Remarcadas</p>
            <div className="p-2 rounded-lg bg-warning/20">
              <Repeat className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.rescheduled || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Procedimentos</p>
            <div className="p-2 rounded-lg bg-primary/20">
              <Syringe className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.procedures || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Por Médico
          </TabsTrigger>
          <TabsTrigger value="procedures" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Por Procedimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {!clinicalConfig.doctor_custom_field_id ? (
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Configure o campo personalizado de médico nas configurações clínicas.
              </CardContent>
            </Card>
          ) : doctorData.length === 0 ? (
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum dado de médico encontrado nos leads.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Doctor conversion chart */}
              <Card className="bg-gradient-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Taxa de Conversão por Médico</CardTitle>
                  <CardDescription>
                    Leads atendidos vs. que chegaram a procedimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={doctorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="total" name="Total de Leads" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="converted" name="Procedimentos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Doctor table */}
              <Card className="bg-gradient-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Detalhamento por Médico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Médico</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Total Leads</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Procedimentos</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Taxa Conversão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorData.map((doctor) => (
                          <tr key={doctor.name} className="border-b border-border/30">
                            <td className="py-3 px-2 font-medium">{doctor.name}</td>
                            <td className="py-3 px-2 text-center">{doctor.total}</td>
                            <td className="py-3 px-2 text-center">{doctor.converted}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={doctor.rate >= 50 ? "text-success" : doctor.rate >= 25 ? "text-warning" : "text-destructive"}>
                                {doctor.rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="procedures" className="space-y-6">
          {!clinicalConfig.procedure_custom_field_id ? (
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Configure o campo personalizado de procedimento nas configurações clínicas.
              </CardContent>
            </Card>
          ) : procedureData.length === 0 ? (
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum dado de procedimento encontrado nos leads.
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Pie chart */}
              <Card className="bg-gradient-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Distribuição de Procedimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={procedureData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {procedureData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Procedure table */}
              <Card className="bg-gradient-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Taxa por Procedimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {procedureData.map((proc, i) => {
                      const pct = totalProcedures > 0 ? Math.round((proc.value / totalProcedures) * 100) : 0;
                      return (
                        <div key={proc.name} className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="flex-1 text-sm truncate">{proc.name}</span>
                          <span className="text-sm font-medium">{proc.value}</span>
                          <span className="text-sm text-muted-foreground w-12 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClinicalConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        pipelines={pipelines}
        customFields={customFields}
        credentialId={credentialId}
        onSave={loadClinicalConfig}
      />
    </div>
  );
};
