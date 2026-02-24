import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import DemandsPage from "@/pages/DemandsPage";
import DemandDetailPage from "@/pages/DemandDetailPage";
import NewDemandPage from "@/pages/NewDemandPage";
import QuestionBankPage from "@/pages/QuestionBankPage";
import ExamsPage from "@/pages/ExamsPage";
import ExamEditorPage from "@/pages/ExamEditorPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import {
  TeachersPage,
  ClassGroupsPage,
  ReportsPage,
  TemplatesPage,
} from "@/pages/PlaceholderPages";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/demandas" element={<DemandsPage />} />
            <Route path="/demandas/nova" element={<NewDemandPage />} />
            <Route path="/demandas/:id" element={<DemandDetailPage />} />
            <Route path="/provas" element={<ExamsPage />} />
            <Route path="/provas/editor/:demandId?" element={<ExamEditorPage />} />
            <Route path="/banco-questoes" element={<QuestionBankPage />} />
            <Route path="/aprovacoes" element={<ApprovalsPage />} />
            <Route path="/professores" element={<TeachersPage />} />
            <Route path="/turmas" element={<ClassGroupsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/modelos" element={<TemplatesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
