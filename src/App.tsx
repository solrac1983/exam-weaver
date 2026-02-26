import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import DemandsPage from "@/pages/DemandsPage";
import DemandDetailPage from "@/pages/DemandDetailPage";
import NewDemandPage from "@/pages/NewDemandPage";
import QuestionBankPage from "@/pages/QuestionBankPage";
import ExamsPage from "@/pages/ExamsPage";
import ExamEditorPage from "@/pages/ExamEditorPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import CadastrosPage from "@/pages/CadastrosPage";
import ReportsPage from "@/pages/ReportsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import SimuladosPage from "@/pages/SimuladosPage";
import ChatPage from "@/pages/ChatPage";
import AIQuestionGeneratorPage from "@/pages/AIQuestionGeneratorPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import FinanceiroPage from "@/pages/FinanceiroPage";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import ProfilePage from "@/pages/ProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<SignupPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes - AppLayout handles auth redirect */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminPage /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute allowedRoles={["super_admin"]}><FinanceiroPage /></ProtectedRoute>} />
              <Route path="/demandas" element={<DemandsPage />} />
              <Route path="/demandas/nova" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><NewDemandPage /></ProtectedRoute>} />
              <Route path="/demandas/:id" element={<DemandDetailPage />} />
              <Route path="/provas" element={<ExamsPage />} />
              <Route path="/provas/editor/:demandId?" element={<ExamEditorPage />} />
              <Route path="/banco-questoes" element={<QuestionBankPage />} />
              <Route path="/ai-questoes" element={<AIQuestionGeneratorPage />} />
              <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/cadastros" element={<ProtectedRoute allowedRoles={["admin", "coordinator", "super_admin"]}><CadastrosPage /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "coordinator", "super_admin"]}><ReportsPage /></ProtectedRoute>} />
              <Route path="/modelos" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><TemplatesPage /></ProtectedRoute>} />
              <Route path="/simulados" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><SimuladosPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
