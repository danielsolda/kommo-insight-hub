import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, TrendingUp, TrendingDown, Users, DollarSign, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

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

interface SalesRankingProps {
  salesRanking: SalesRankingData[];
  loading: boolean;
  pipelines: Pipeline[];
  onPipelineChange: (pipelineId: number | null) => void;
}

export const SalesRanking = ({ salesRanking, loading, pipelines, onPipelineChange }: SalesRankingProps) => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");
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
                Top performers com vendas e métricas do mês atual
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
              Top performers com vendas e métricas do mês atual
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
                Top performers com vendas e métricas do mês atual
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
              </div>
            );
          })}
        </div>
        
        {salesRanking.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de vendas disponível</p>
            <p className="text-sm">Aguarde o carregamento dos dados da Kommo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};