import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy-loaded pages with automatic retry on stale chunks
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const DemandsPage = lazyWithRetry(() => import("@/pages/DemandsPage"));
const DemandDetailPage = lazyWithRetry(() => import("@/pages/DemandDetailPage"));
const NewDemandPage = lazyWithRetry(() => import("@/pages/NewDemandPage"));
const QuestionBankPage = lazyWithRetry(() => import("@/pages/QuestionBankPage"));
const ExamEditorPage = lazyWithRetry(() => import("@/pages/ExamEditorPage"));
const ApprovalsPage = lazyWithRetry(() => import("@/pages/ApprovalsPage"));
const CadastrosPage = lazyWithRetry(() => import("@/pages/CadastrosPage"));
const ReportsPage = lazyWithRetry(() => import("@/pages/ReportsPage"));
const TemplatesPage = lazyWithRetry(() => import("@/pages/TemplatesPage"));
const SimuladosPage = lazyWithRetry(() => import("@/pages/SimuladosPage"));
const ChatPage = lazyWithRetry(() => import("@/pages/ChatPage"));
const AIQuestionGeneratorPage = lazyWithRetry(() => import("@/pages/AIQuestionGeneratorPage"));
const SuperAdminPage = lazyWithRetry(() => import("@/pages/SuperAdminPage"));
const FinanceiroPage = lazyWithRetry(() => import("@/pages/FinanceiroPage"));
const LandingPage = lazyWithRetry(() => import("@/pages/LandingPage"));
const LoginPage = lazyWithRetry(() => import("@/pages/LoginPage"));
const SignupPage = lazyWithRetry(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyWithRetry(() => import("@/pages/ResetPasswordPage"));
const ProfilePage = lazyWithRetry(() => import("@/pages/ProfilePage"));
const MinhasTurmasPage = lazyWithRetry(() => import("@/pages/MinhasTurmasPage"));
const PaymentStatusPage = lazyWithRetry(() => import("@/pages/PaymentStatusPage"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
              <Route path="/pagamento" element={<PaymentStatusPage />} />

              {/* Protected routes - AppLayout has its own Suspense keeping sidebar visible */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminPage /></ProtectedRoute>} />
                <Route path="/financeiro" element={<ProtectedRoute allowedRoles={["super_admin"]}><FinanceiroPage /></ProtectedRoute>} />
                <Route path="/demandas" element={<DemandsPage />} />
                <Route path="/demandas/nova" element={<ProtectedRoute allowedRoles={["admin"]}><NewDemandPage /></ProtectedRoute>} />
                <Route path="/demandas/:id" element={<DemandDetailPage />} />
                <Route path="/provas/editor/:demandId?" element={<ExamEditorPage />} />
                <Route path="/banco-questoes" element={<QuestionBankPage />} />
                <Route path="/ai-questoes" element={<AIQuestionGeneratorPage />} />
                <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin"]}><ApprovalsPage /></ProtectedRoute>} />
                <Route path="/cadastros" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><CadastrosPage /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><ReportsPage /></ProtectedRoute>} />
                <Route path="/modelos" element={<ProtectedRoute allowedRoles={["admin"]}><TemplatesPage /></ProtectedRoute>} />
                <Route path="/simulados" element={<SimuladosPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/minhas-turmas" element={<ProtectedRoute allowedRoles={["professor"]}><MinhasTurmasPage /></ProtectedRoute>} />
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
