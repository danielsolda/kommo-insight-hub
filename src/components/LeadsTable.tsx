import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, Phone, Mail, Calendar, Star, Loader2, CalendarIcon, X, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const stageColors: { [key: string]: string } = {
  "Prospecção": "bg-gray-500/20 text-gray-300",
  "Qualificação": "bg-blue-500/20 text-blue-300", 
  "Proposta": "bg-yellow-500/20 text-yellow-300",
  "Negociação": "bg-orange-500/20 text-orange-300",
  "Fechamento": "bg-green-500/20 text-green-300",
  "Etapa de entrada": "bg-purple-500/20 text-purple-300",
  "Estágio não definido": "bg-gray-500/20 text-gray-300"
};

const priorityColors = {
  "high": "text-red-400",
  "medium": "text-yellow-400", 
  "low": "text-green-400"
};

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface Filters {
  dateRange: DateRange;
  minValue: string;
  maxValue: string;
  stage: string;
  priority: string;
}

interface Lead {
  id: string | number;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  value: number;
  lastContact: string;
  priority: string;
  source: string;
}

interface LeadsTableProps {
  leads?: Lead[];
  loading?: boolean;
}

export const LeadsTable = ({ leads = [], loading = false }: LeadsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateRange: { startDate: null, endDate: null },
    minValue: "",
    maxValue: "",
    stage: "all",
    priority: "all"
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    applyFilters();
  }, [leads, searchTerm, filters]);

  const applyFilters = () => {
    let filtered = leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Date filter
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.lastContact);
        if (filters.dateRange.startDate && leadDate < filters.dateRange.startDate) return false;
        if (filters.dateRange.endDate && leadDate > filters.dateRange.endDate) return false;
        return true;
      });
    }

    // Value filter
    if (filters.minValue) {
      const minVal = parseFloat(filters.minValue);
      if (!isNaN(minVal)) {
        filtered = filtered.filter(lead => lead.value >= minVal);
      }
    }
    if (filters.maxValue) {
      const maxVal = parseFloat(filters.maxValue);
      if (!isNaN(maxVal)) {
        filtered = filtered.filter(lead => lead.value <= maxVal);
      }
    }

    // Stage filter
    if (filters.stage !== "all") {
      filtered = filtered.filter(lead => lead.stage === filters.stage);
    }

    // Priority filter
    if (filters.priority !== "all") {
      filtered = filtered.filter(lead => lead.priority === filters.priority);
    }

    setFilteredLeads(filtered);

    // Count active filters
    let count = 0;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.minValue || filters.maxValue) count++;
    if (filters.stage !== "all") count++;
    if (filters.priority !== "all") count++;
    setActiveFiltersCount(count);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: { startDate: null, endDate: null },
      minValue: "",
      maxValue: "",
      stage: "all",
      priority: "all"
    });
    setSearchTerm("");
  };

  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date || null
      }
    }));
  };

  // Get unique stages and priorities from leads
  const uniqueStages = Array.from(new Set(leads.map(lead => lead.stage)));
  const uniquePriorities = Array.from(new Set(leads.map(lead => lead.priority)));

  const exportToCSV = () => {
    if (filteredLeads.length === 0) return;

    // CSV headers
    const headers = ['Nome', 'Empresa', 'Email', 'Telefone', 'Estágio', 'Valor', 'Último Contato', 'Prioridade', 'Origem'];
    
    // Convert leads to CSV rows
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${lead.name}"`,
        `"${lead.company}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.stage}"`,
        lead.value,
        `"${new Date(lead.lastContact).toLocaleDateString('pt-BR')}"`,
        `"${lead.priority}"`,
        `"${lead.source}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              Gerencie seus leads e oportunidades de vendas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredLeads.length === 0}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button size="sm" variant={activeFiltersCount > 0 ? "default" : "outline"} className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtros Avançados</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Período de Contato</label>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal flex-1",
                              !filters.dateRange.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange.startDate ? format(filters.dateRange.startDate, "dd/MM/yy") : "De"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={filters.dateRange.startDate || undefined}
                            onSelect={(date) => handleCustomDateChange('startDate', date)}
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
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal flex-1",
                              !filters.dateRange.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange.endDate ? format(filters.dateRange.endDate, "dd/MM/yy") : "Até"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={filters.dateRange.endDate || undefined}
                            onSelect={(date) => handleCustomDateChange('endDate', date)}
                            disabled={(date) => date > new Date() || (filters.dateRange.startDate && date < filters.dateRange.startDate)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Value Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Faixa de Valor (R$)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Mín"
                        type="number"
                        value={filters.minValue}
                        onChange={(e) => updateFilter('minValue', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Máx"
                        type="number"
                        value={filters.maxValue}
                        onChange={(e) => updateFilter('maxValue', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Stage Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estágio</label>
                    <Select value={filters.stage} onValueChange={(value) => updateFilter('stage', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os estágios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os estágios</SelectItem>
                        {uniqueStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as prioridades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as prioridades</SelectItem>
                        {uniquePriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile export button */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredLeads.length === 0}
              className="sm:hidden"
            >
              <Download className="h-4 w-4" />
            </Button>
            {(activeFiltersCount > 0 || searchTerm) && (
              <div className="text-sm text-muted-foreground">
                {filteredLeads.length}/{leads.length} leads
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''})`}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando leads...</span>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[200px]">Lead</TableHead>
                    <TableHead className="min-w-[120px]">Estágio</TableHead>
                    <TableHead className="min-w-[100px]">Valor</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Último Contato</TableHead>
                    <TableHead className="min-w-[100px] hidden md:table-cell">Prioridade</TableHead>
                    <TableHead className="min-w-[100px] hidden lg:table-cell">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/20">
                    <TableCell className="min-w-[200px]">
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.company}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[160px]">{lead.email}</span>
                        </div>
                        {/* Mobile-only info */}
                        <div className="sm:hidden mt-2 flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className={`h-3 w-3 ${priorityColors[lead.priority as keyof typeof priorityColors]}`} />
                            <span className="capitalize">{lead.priority}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <Badge className={stageColors[lead.stage as keyof typeof stageColors]}>
                        {lead.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium min-w-[100px]">
                      R$ {lead.value.toLocaleString()}
                    </TableCell>
                    <TableCell className="min-w-[120px] hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px] hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Star className={`h-3 w-3 ${priorityColors[lead.priority as keyof typeof priorityColors]}`} />
                        <span className="text-sm capitalize">{lead.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px] hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mobile action buttons */}
        {!loading && (
          <div className="lg:hidden mt-4 flex flex-wrap gap-2">
            {filteredLeads.slice(0, 3).map((lead) => (
              <div key={`mobile-actions-${lead.id}`} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground truncate max-w-[100px]">{lead.name}:</span>
                <Button size="sm" variant="outline">
                  <Phone className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Results summary - only show if not already shown in header */}
        {!(activeFiltersCount > 0 || searchTerm) && (
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
};