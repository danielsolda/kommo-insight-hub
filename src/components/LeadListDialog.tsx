import { Lead } from "@/services/kommoApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  day: string;
  type: 'created' | 'updated' | 'closed';
  users: any[];
}

const typeLabels = {
  created: 'Criados',
  updated: 'Atualizados',
  closed: 'Fechados'
};

const typeColors = {
  created: 'bg-primary/10 text-primary border-primary/20',
  updated: 'bg-success/10 text-success border-success/20',
  closed: 'bg-warning/10 text-warning border-warning/20'
};

export const LeadListDialog = ({
  open,
  onOpenChange,
  leads,
  day,
  type,
  users
}: LeadListDialogProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'N/A';
  };

  const totalValue = leads.reduce((sum, lead) => sum + (lead.price || 0), 0);
  const avgValue = leads.length > 0 ? totalValue / leads.length : 0;

  const getDateForType = (lead: Lead) => {
    switch (type) {
      case 'created':
        return formatDate(lead.created_at);
      case 'updated':
        return lead.updated_at ? formatDate(lead.updated_at) : 'N/A';
      case 'closed':
        return lead.closed_at ? formatDate(lead.closed_at) : 'N/A';
      default:
        return 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Leads {typeLabels[type]} - {day}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-4 mt-2">
            <Badge variant="outline" className={typeColors[type]}>
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
            </Badge>
            <Badge variant="outline">
              Total: {formatCurrency(totalValue)}
            </Badge>
            <Badge variant="outline">
              Média: {formatCurrency(avgValue)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-180px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.name}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(lead.price || 0)}
                    </TableCell>
                    <TableCell>
                      {getUserName(lead.responsible_user_id)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getDateForType(lead)}
                    </TableCell>
                    <TableCell className="text-right">
                      {lead.id && (
                        <a
                          href={`https://kommo.com/leads/detail/${lead.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
