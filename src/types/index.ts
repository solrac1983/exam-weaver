export type UserRole = "super_admin" | "admin" | "coordinator" | "professor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type DemandStatus = "pending" | "in_progress" | "submitted" | "review" | "revision_requested" | "approved" | "final";

export type ExamType = "mensal" | "bimestral" | "simulado" | "recuperacao";

export interface Demand {
  id: string;
  coordinatorId: string;
  coordinatorName: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classGroups: string[];
  examType: ExamType;
  applicationDate?: string;
  deadline: string;
  status: DemandStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamVersion {
  id: string;
  demandId: string;
  version: number;
  status: "draft" | "submitted" | "reviewed" | "approved" | "final";
  createdAt: string;
}

export interface QuestionBankItem {
  id: string;
  subjectId: string;
  subjectName: string;
  classGroup: string;
  bimester: string;
  topic: string;
  grade: string;
  content: string;
  type: "objetiva" | "discursiva";
  difficulty: "facil" | "media" | "dificil";
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}
