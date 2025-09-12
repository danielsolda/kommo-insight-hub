import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Phone, Mail, Calendar, Star } from "lucide-react";
import { useState } from "react";

const mockLeads = [
  {
    id: 1,
    name: "João Silva",
    company: "Tech Solutions Ltd",
    email: "joao@techsolutions.com",
    phone: "(11) 99999-1234",
    stage: "Qualificação",
    value: 15000,
    lastContact: "2024-01-15",
    priority: "high",
    source: "Website"
  },
  {
    id: 2,
    name: "Maria Santos",
    company: "Inovação Digital",
    email: "maria@inovacaodigital.com",
    phone: "(21) 88888-5678",
    stage: "Proposta",
    value: 25000,
    lastContact: "2024-01-14",
    priority: "medium",
    source: "Indicação"
  },
  {
    id: 3,
    name: "Carlos Oliveira",
    company: "StartupX",
    email: "carlos@startupx.com",
    phone: "(31) 77777-9012",
    stage: "Negociação",
    value: 35000,
    lastContact: "2024-01-13",
    priority: "high",
    source: "LinkedIn"
  },
  {
    id: 4,
    name: "Ana Costa",
    company: "Empresa ABC",
    email: "ana@empresaabc.com",
    phone: "(41) 66666-3456",
    stage: "Prospecção",
    value: 12000,
    lastContact: "2024-01-12",
    priority: "low",
    source: "Google Ads"
  },
  {
    id: 5,
    name: "Pedro Lima",
    company: "Consultoria Pro",
    email: "pedro@consultoriapro.com",
    phone: "(51) 55555-7890",
    stage: "Fechamento",
    value: 45000,
    lastContact: "2024-01-11",
    priority: "high",
    source: "Evento"
  }
];

const stageColors = {
  "Prospecção": "bg-gray-500/20 text-gray-300",
  "Qualificação": "bg-blue-500/20 text-blue-300",
  "Proposta": "bg-yellow-500/20 text-yellow-300",
  "Negociação": "bg-orange-500/20 text-orange-300",
  "Fechamento": "bg-green-500/20 text-green-300"
};

const priorityColors = {
  "high": "text-red-400",
  "medium": "text-yellow-400",
  "low": "text-green-400"
};

export const LeadsTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLeads, setFilteredLeads] = useState(mockLeads);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = mockLeads.filter(lead =>
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

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredLeads.length} de {mockLeads.length} leads
        </div>
      </CardContent>
    </Card>
  );
};