import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalFilters } from "@/contexts/FilterContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pipeline, User } from "@/services/kommoApi";
import { Badge } from "@/components/ui/badge";

interface GlobalFiltersProps {
  pipelines?: Pipeline[];
  users?: User[];
  loading?: boolean;
}

export const GlobalFilters = ({ pipelines = [], users = [], loading }: GlobalFiltersProps) => {
  const { filters, setDateRange, setPipelineId, setUserId, resetFilters } = useGlobalFilters();
  
  const activeFiltersCount = [
    filters.pipelineId !== null,
    filters.userId !== null
  ].filter(Boolean).length;

  const selectedPipeline = pipelines.find(p => p.id === filters.pipelineId);
  const selectedUser = users.find(u => u.id === filters.userId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">
              {format(filters.dateRange.from, "dd/MMM", { locale: ptBR })} - {format(filters.dateRange.to, "dd/MMM", { locale: ptBR })}
            </span>
            <span className="sm:hidden">Período</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border-border shadow-elegant" align="start">
          <div className="p-3 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Data Inicial</p>
              <CalendarComponent
                mode="single"
                selected={filters.dateRange.from}
                onSelect={(date) => date && setDateRange(date, filters.dateRange.to)}
                locale={ptBR}
                disabled={loading}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Data Final</p>
              <CalendarComponent
                mode="single"
                selected={filters.dateRange.to}
                onSelect={(date) => date && setDateRange(filters.dateRange.from, date)}
                locale={ptBR}
                disabled={loading}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Pipeline Filter */}
      <Select
        value={filters.pipelineId?.toString() || "all"}
        onValueChange={(value) => setPipelineId(value === "all" ? null : Number(value))}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px] h-9 bg-background border-border">
          <SelectValue placeholder="Todos os Funis" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-elegant z-50">
          <SelectItem value="all">Todos os Funis</SelectItem>
          {pipelines.filter(p => p.id != null).map((pipeline) => (
            <SelectItem key={pipeline.id} value={String(pipeline.id)}>
              {pipeline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User Filter */}
      <Select
        value={filters.userId?.toString() || "all"}
        onValueChange={(value) => setUserId(value === "all" ? null : Number(value))}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px] h-9 bg-background border-border">
          <SelectValue placeholder="Todos os Usuários" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-elegant z-50">
          <SelectItem value="all">Todos os Usuários</SelectItem>
          {users.filter(u => u.id != null).map((user) => (
            <SelectItem key={user.id} value={String(user.id)}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filters Badge & Reset */}
      {activeFiltersCount > 0 && (
        <>
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-9 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Active Filter Pills */}
      <div className="flex flex-wrap gap-1">
        {selectedPipeline && (
          <Badge variant="outline" className="gap-1">
            {selectedPipeline.name}
            <X 
              className="h-3 w-3 cursor-pointer hover:text-destructive" 
              onClick={() => setPipelineId(null)}
            />
          </Badge>
        )}
        {selectedUser && (
          <Badge variant="outline" className="gap-1">
            {selectedUser.name}
            <X 
              className="h-3 w-3 cursor-pointer hover:text-destructive" 
              onClick={() => setUserId(null)}
            />
          </Badge>
        )}
      </div>
    </div>
  );
};
