import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpChatbot } from "./HelpChatbot";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function FloatingHelpButton() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      {/* Chat popup */}
      {open && (
        <div
          className={cn(
            "fixed z-50 shadow-2xl rounded-xl overflow-hidden",
            isMobile
              ? "inset-4 bottom-20"
              : "bottom-20 right-6 w-[400px]"
          )}
        >
          <Card className="h-full border-primary/20">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-primary/5">
              <span className="text-sm font-semibold">Assistente de Ajuda</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-3 h-[calc(100%-44px)]">
              <HelpChatbot />
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAB */}
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className={cn(
          "fixed z-50 h-12 w-12 rounded-full shadow-lg transition-all",
          "bg-primary hover:bg-primary/90",
          isMobile ? "bottom-4 right-4" : "bottom-6 right-6"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </Button>
    </>
  );
}
