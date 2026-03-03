import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuestionBankItem } from "@/types";

export function useQuestions() {
  const { user, profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching questions:", error);
      setLoading(false);
      return;
    }

    const mapped: QuestionBankItem[] = (data || []).map((q: any) => ({
      id: q.id,
      subjectId: q.subject_id || "",
      subjectName: q.subject_name,
      classGroup: q.class_group,
      bimester: q.bimester,
      topic: q.topic,
      grade: q.grade,
      content: q.content,
      type: q.type as "objetiva" | "discursiva",
      difficulty: q.difficulty as "facil" | "media" | "dificil",
      tags: q.tags || [],
      authorId: q.author_id,
      authorName: q.author_name,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    }));

    setQuestions(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchQuestions();

    const channel = supabase
      .channel("questions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuestions]);

  const createQuestion = async (data: {
    subjectId: string;
    subjectName: string;
    classGroup: string;
    bimester: string;
    topic: string;
    grade: string;
    content: string;
    type: string;
    difficulty: string;
    tags: string[];
  }) => {
    if (!profile?.company_id || !user) return null;

    const { data: row, error } = await supabase
      .from("questions")
      .insert({
        company_id: profile.company_id,
        subject_name: data.subjectName,
        class_group: data.classGroup,
        bimester: data.bimester,
        topic: data.topic,
        grade: data.grade,
        content: data.content,
        type: data.type,
        difficulty: data.difficulty,
        tags: data.tags,
        author_id: user.id,
        author_name: profile.full_name || "",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating question:", error);
      return null;
    }
    return row;
  };

  const updateQuestion = async (
    id: string,
    data: {
      subjectName: string;
      classGroup: string;
      bimester: string;
      topic: string;
      grade: string;
      content: string;
      type: string;
      difficulty: string;
      tags: string[];
    }
  ) => {
    const { error } = await supabase
      .from("questions")
      .update({
        subject_name: data.subjectName,
        class_group: data.classGroup,
        bimester: data.bimester,
        topic: data.topic,
        grade: data.grade,
        content: data.content,
        type: data.type,
        difficulty: data.difficulty,
        tags: data.tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating question:", error);
      return false;
    }
    return true;
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      console.error("Error deleting question:", error);
      return false;
    }
    return true;
  };

  const bulkInsert = async (items: Array<{
    subjectName: string;
    classGroup: string;
    bimester: string;
    topic: string;
    grade: string;
    content: string;
    type: string;
    difficulty: string;
    tags: string[];
  }>) => {
    if (!profile?.company_id || !user) return false;

    const rows = items.map((q) => ({
      company_id: profile.company_id!,
      subject_name: q.subjectName,
      class_group: q.classGroup,
      bimester: q.bimester,
      topic: q.topic,
      grade: q.grade,
      content: q.content,
      type: q.type,
      difficulty: q.difficulty,
      tags: q.tags,
      author_id: user.id,
      author_name: profile.full_name || "",
    }));

    const { error } = await supabase.from("questions").insert(rows);
    if (error) {
      console.error("Error bulk inserting questions:", error);
      return false;
    }
    return true;
  };

  return {
    questions,
    loading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkInsert,
    refetch: fetchQuestions,
  };
}
