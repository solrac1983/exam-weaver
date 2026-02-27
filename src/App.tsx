import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// Lazy-loaded pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const DemandsPage = lazy(() => import("@/pages/DemandsPage"));
const DemandDetailPage = lazy(() => import("@/pages/DemandDetailPage"));
const NewDemandPage = lazy(() => import("@/pages/NewDemandPage"));
const QuestionBankPage = lazy(() => import("@/pages/QuestionBankPage"));
const ExamEditorPage = lazy(() => import("@/pages/ExamEditorPage"));
const ApprovalsPage = lazy(() => import("@/pages/ApprovalsPage"));
const CadastrosPage = lazy(() => import("@/pages/CadastrosPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const SimuladosPage = lazy(() => import("@/pages/SimuladosPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const AIQuestionGeneratorPage = lazy(() => import("@/pages/AIQuestionGeneratorPage"));
const SuperAdminPage = lazy(() => import("@/pages/SuperAdminPage"));
const FinanceiroPage = lazy(() => import("@/pages/FinanceiroPage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<DashboardSkeleton />}>
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
                <Route path="/provas/editor/:demandId?" element={<ExamEditorPage />} />
                <Route path="/banco-questoes" element={<QuestionBankPage />} />
                <Route path="/ai-questoes" element={<AIQuestionGeneratorPage />} />
                <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><ApprovalsPage /></ProtectedRoute>} />
                <Route path="/cadastros" element={<ProtectedRoute allowedRoles={["admin", "coordinator", "super_admin"]}><CadastrosPage /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "coordinator", "super_admin"]}><ReportsPage /></ProtectedRoute>} />
                <Route path="/modelos" element={<ProtectedRoute allowedRoles={["admin", "coordinator"]}><TemplatesPage /></ProtectedRoute>} />
                <Route path="/simulados" element={<SimuladosPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
