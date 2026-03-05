import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TemplateFolder } from "@/components/templates/TemplateFolderManager";
import { HeadersTab } from "@/components/templates/HeadersTab";
import { DocumentsTab } from "@/components/templates/DocumentsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Image as ImageIcon, FileText, FileEdit,
} from "lucide-react";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [headerFolders, setHeaderFolders] = useState<TemplateFolder[]>([]);
  const [headerActiveFolderId, setHeaderActiveFolderId] = useState<string | null>(null);
  const [docFolders, setDocFolders] = useState<TemplateFolder[]>([]);
  const [docActiveFolderId, setDocActiveFolderId] = useState<string | null>(null);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10">
            <BookOpen className="h-5.5 w-5.5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Modelos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie cabeçalhos de provas e modelos de documentos
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/provas/editor")} className="gap-1.5">
          <FileEdit className="h-4 w-4" />
          Criar modelo no editor
        </Button>
      </div>

      <Tabs defaultValue="cabecalhos" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="cabecalhos" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Cabeçalhos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Modelos de Prova
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cabecalhos">
          <HeadersTab
            folders={headerFolders}
            setFolders={setHeaderFolders}
            activeFolderId={headerActiveFolderId}
            setActiveFolderId={setHeaderActiveFolderId}
          />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentsTab
            folders={docFolders}
            setFolders={setDocFolders}
            activeFolderId={docActiveFolderId}
            setActiveFolderId={setDocActiveFolderId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
