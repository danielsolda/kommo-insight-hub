import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Crown, TrendingUp, TrendingDown, Users, DollarSign, Filter, Calendar as CalendarIcon, Bug, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useKommoApi } from "@/hooks/useKommoApi";

interface SalesRankingData {
  userId: number;
  userName: string;
  totalSales: number;
  salesQuantity: number;
  monthlyAverage: number;
  currentMonthSales: number;
  currentMonthQuantity: number;
}

interface Pipeline {
  id: number;
  name: string;
  is_main: boolean;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface SalesRankingProps {
  salesRanking: SalesRankingData[];
  loading: boolean;
  pipelines: Pipeline[];
  onPipelineChange: (pipelineId: number | null) => void;
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
}

export const SalesRanking = ({ salesRanking, loading, pipelines, onPipelineChange, dateRange, onDateRangeChange }: SalesRankingProps) => {
  console.log('🔍 SalesRanking component received:', { 
    salesRankingLength: salesRanking.length, 
    loading, 
    pipelinesLength: pipelines.length 
  });
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all-time");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  
  const { calculateSalesRanking, users, allLeads } = useKommoApi();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
    if (value === "all") {
      onPipelineChange(null);
    } else {
      onPipelineChange(Number(value));
    }
  };

  // Handle debug mode toggle
  const handleDebugToggle = () => {
    setDebugMode(!debugMode);
    // Recalculate ranking without arguments - let the hook handle the logic
    calculateSalesRanking();
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    const now = new Date();
    
    switch (value) {
      case "current-month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onDateRangeChange({ startDate: startOfMonth, endDate: endOfMonth });
        break;
      case "last-30-days":
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        onDateRangeChange({ startDate: last30Days, endDate: now });
        break;
      case "last-3-months":
        const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        onDateRangeChange({ startDate: last3Months, endDate: now });
        break;
      case "all-time":
        onDateRangeChange({ startDate: null, endDate: null });
        break;
      case "custom":
        // Keep current dateRange for custom selection
        break;
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (dateFilter === 'custom') {
      onDateRangeChange({
        ...dateRange,
        [field === 'start' ? 'startDate' : 'endDate']: date || null
      });
    }
  };

  const getPeriodDescription = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return "Todas as vendas";
    }
    
    const start = format(dateRange.startDate, "dd/MM/yyyy", { locale: ptBR });
    const end = format(dateRange.endDate, "dd/MM/yyyy", { locale: ptBR });
    
    if (dateFilter === "current-month") {
      return "Vendas do mês atual";
    } else if (dateFilter === "last-30-days") {
      return "Últimos 30 dias";
    } else if (dateFilter === "last-3-months") {
      return "Últimos 3 meses";
    } else {
      return `Período: ${start} - ${end}`;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pipelines</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name} {pipeline.is_main && "(Principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/30">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salesRanking.length) {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Ranking de Vendedores
            </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
          </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Este mês</SelectItem>
                  <SelectItem value="last-30-days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                  <SelectItem value="all-time">Todas as vendas</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Pickers */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-36 justify-start text-left font-normal",
                          !dateRange.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.startDate ? format(dateRange.startDate, "dd/MM/yy") : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.startDate || undefined}
                        onSelect={(date) => handleCustomDateChange('start', date)}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-36 justify-start text-left font-normal",
                          !dateRange.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.endDate ? format(dateRange.endDate, "dd/MM/yy") : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.endDate || undefined}
                        onSelect={(date) => handleCustomDateChange('end', date)}
                        disabled={(date) => date > new Date() || (dateRange.startDate && date < dateRange.startDate)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Pipeline Filter */}
              <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pipelines</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name} {pipeline.is_main && "(Principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum vendedor com vendas encontrado</p>
            <p className="text-sm">Verifique se há leads associados aos usuários</p>
          </div>
        </CardContent>
      </Card>
    );
  }

    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Debug Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDebugToggle}
                className={cn(
                  "flex items-center gap-2",
                  debugMode && "bg-orange-100 text-orange-700 border-orange-300"
                )}
              >
                <Bug className="h-4 w-4" />
                Debug
                {debugMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              
              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Este mês</SelectItem>
                  <SelectItem value="last-30-days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                  <SelectItem value="all-time">Todas as vendas</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Pickers */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-36 justify-start text-left font-normal",
                          !dateRange.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.startDate ? format(dateRange.startDate, "dd/MM/yy") : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.startDate || undefined}
                        onSelect={(date) => handleCustomDateChange('start', date)}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-36 justify-start text-left font-normal",
                          !dateRange.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.endDate ? format(dateRange.endDate, "dd/MM/yy") : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.endDate || undefined}
                        onSelect={(date) => handleCustomDateChange('end', date)}
                        disabled={(date) => date > new Date() || (dateRange.startDate && date < dateRange.startDate)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Pipeline Filter */}
              <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pipelines</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name} {pipeline.is_main && "(Principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Debug Information */}
          {debugMode && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="h-4 w-4 text-orange-600" />
                <h3 className="font-medium text-orange-800">Informações de Debug</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong className="text-orange-700">Dados Carregados:</strong>
                  <ul className="mt-1 space-y-1 text-orange-600">
                    <li>👥 Usuários: {users?.length || 0}</li>
                    <li>📋 Leads: {allLeads?.length || 0}</li>
                    <li>🔄 Pipelines: {pipelines?.length || 0}</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-orange-700">Filtros Ativos:</strong>
                  <ul className="mt-1 space-y-1 text-orange-600">
                    <li>🔄 Pipeline: {selectedPipeline !== "all" ? `ID ${selectedPipeline}` : 'Todas'}</li>
                    <li>📅 Período: {dateFilter}</li>
                    <li>🐛 Mostrar Zero: {debugMode ? 'Sim' : 'Não'}</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-orange-700">Resultado:</strong>
                  <ul className="mt-1 space-y-1 text-orange-600">
                    <li>🏆 Vendedores: {salesRanking?.length || 0}</li>
                    <li>📊 Status: {loading ? 'Carregando...' : 'Pronto'}</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                💡 <strong>Dica:</strong> Abra o console do navegador (F12) para ver logs detalhados do processamento.
              </div>
            </div>
          )}

        <div className="space-y-4">
          {salesRanking.slice(0, 10).map((seller, index) => {
            const isCurrentMonthBetter = seller.currentMonthSales >= seller.monthlyAverage;
            const positionIcon = index === 0 ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
            );

            return (
              <div key={seller.userId} className="flex items-center gap-4 p-4 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  {positionIcon}
                  <div>
                    <h4 className="font-semibold">{seller.userName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {seller.salesQuantity} vendas totais
                    </p>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Vendas</p>
                    <p className="font-bold text-primary">{formatCurrency(seller.totalSales)}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Média Mensal</p>
                    <p className="font-semibold">{formatCurrency(seller.monthlyAverage)}</p>
                  </div>
                  
                  <div className="hidden lg:block">
                    <p className="text-muted-foreground">Mês Atual</p>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold">{formatCurrency(seller.currentMonthSales)}</p>
                      {isCurrentMonthBetter ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "bg-gradient-primary text-white" : ""}
                  >
                    {seller.currentMonthQuantity} este mês
                  </Badge>
                </div>
                
                {/* Debug Info for Each Seller */}
                {debugMode && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded w-full">
                    <div className="grid grid-cols-2 gap-2">
                      <span>ID do Usuário: {seller.userId}</span>
                      <span>Vendas Totais: {seller.salesQuantity}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {salesRanking.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {debugMode ? (
              <div className="space-y-2">
                <p>🔍 <strong>Debug Mode:</strong> Nenhum vendedor encontrado</p>
                <p className="text-sm">Verifique o console para logs detalhados</p>
                <p className="text-xs">Dados: {users?.length || 0} usuários, {allLeads?.length || 0} leads, {pipelines?.length || 0} pipelines</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>📊 Nenhum vendedor com vendas encontrado no período selecionado</p>
                <p className="text-sm">Ative o modo Debug para mais informações</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};