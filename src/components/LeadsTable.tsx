import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Phone, Mail, Calendar, Star, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    setFilteredLeads(leads);
  }, [leads]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = leads.filter(lead =>
      lead.name.toLowerCase().includes(term.toLowerCase()) ||
      lead.company.toLowerCase().includes(term.toLowerCase()) ||
      lead.email.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredLeads(filtered);
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
          <Button size="sm" className="bg-gradient-primary">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
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
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Lead</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Último Contato</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground">{lead.company}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={stageColors[lead.stage as keyof typeof stageColors]}>
                      {lead.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {lead.value.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className={`h-3 w-3 ${priorityColors[lead.priority as keyof typeof priorityColors]}`} />
                      <span className="text-sm capitalize">{lead.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>
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
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredLeads.length} de {leads.length} leads
        </div>
      </CardContent>
    </Card>
  );
};