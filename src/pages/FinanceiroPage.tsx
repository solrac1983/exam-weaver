import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, CreditCard, Building2, CalendarClock, TrendingUp, Plus, Pencil, Trash2,
  AlertTriangle, CheckCircle2, Clock, Loader2, Search, X, BarChart3, Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import PaymentMethodsSection from "@/components/financeiro/PaymentMethodsSection";
import InvoicesSection from "@/components/financeiro/InvoicesSection";
import FinancialOverview from "@/components/financeiro/FinancialOverview";
import DueAlertsSection from "@/components/financeiro/DueAlertsSection";
import { FinanceiroSkeleton } from "@/components/PageSkeleton";

export default function FinanceiroPage() {
  const { role, loading: authLoading } = useAuth();

  if (authLoading) return <FinanceiroSkeleton />;
  if (role !== "super_admin") return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie pagamentos, vencimentos e controle financeiro das empresas
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Vencimentos
          </TabsTrigger>
          <TabsTrigger value="methods" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Meios de Pagamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><FinancialOverview /></TabsContent>
        <TabsContent value="invoices"><InvoicesSection /></TabsContent>
        <TabsContent value="alerts"><DueAlertsSection /></TabsContent>
        <TabsContent value="methods"><PaymentMethodsSection /></TabsContent>
      </Tabs>
    </div>
  );
}
