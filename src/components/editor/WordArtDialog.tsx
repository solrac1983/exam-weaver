import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WordArtStyle {
  id: string;
  label: string;
  css: string;
  preview: React.CSSProperties;
}

const wordArtStyles: WordArtStyle[] = [
  {
    id: "gradient-blue",
    label: "Azul Gradiente",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 },
  },
  {
    id: "gradient-fire",
    label: "Fogo",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(135deg,#f12711 0%,#f5af19 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#f12711 0%,#f5af19 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 },
  },
  {
    id: "gradient-ocean",
    label: "Oceano",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(135deg,#00c6fb 0%,#005bea 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#00c6fb 0%,#005bea 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 },
  },
  {
    id: "gradient-forest",
    label: "Floresta",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 },
  },
  {
    id: "gradient-sunset",
    label: "Pôr do Sol",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(135deg,#fa709a 0%,#fee140 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 },
  },
  {
    id: "outline-dark",
    label: "Contorno Escuro",
    css: "font-size:36px;font-weight:900;text-align:center;color:transparent;-webkit-text-stroke:2px #1a1a2e;letter-spacing:3px;",
    preview: { fontSize: 28, fontWeight: 900, color: "transparent", WebkitTextStroke: "2px #1a1a2e", letterSpacing: 3 },
  },
  {
    id: "outline-blue",
    label: "Contorno Azul",
    css: "font-size:36px;font-weight:900;text-align:center;color:transparent;-webkit-text-stroke:2px #3b82f6;letter-spacing:3px;",
    preview: { fontSize: 28, fontWeight: 900, color: "transparent", WebkitTextStroke: "2px #3b82f6", letterSpacing: 3 },
  },
  {
    id: "shadow-3d",
    label: "3D Sombra",
    css: "font-size:36px;font-weight:900;text-align:center;color:#2d3436;text-shadow:3px 3px 0 #636e72,6px 6px 0 #b2bec3;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, color: "#2d3436", textShadow: "3px 3px 0 #636e72, 6px 6px 0 #b2bec3", letterSpacing: 2 },
  },
  {
    id: "shadow-neon",
    label: "Neon",
    css: "font-size:36px;font-weight:900;text-align:center;color:#00ff88;text-shadow:0 0 7px #00ff88,0 0 10px #00ff88,0 0 21px #00ff88,0 0 42px #0fa;letter-spacing:3px;",
    preview: { fontSize: 28, fontWeight: 900, color: "#00ff88", textShadow: "0 0 7px #00ff88,0 0 10px #00ff88,0 0 21px #00ff88,0 0 42px #0fa", letterSpacing: 3 },
  },
  {
    id: "shadow-neon-pink",
    label: "Neon Rosa",
    css: "font-size:36px;font-weight:900;text-align:center;color:#ff6ec7;text-shadow:0 0 7px #ff6ec7,0 0 10px #ff6ec7,0 0 21px #ff6ec7,0 0 42px #ff1493;letter-spacing:3px;",
    preview: { fontSize: 28, fontWeight: 900, color: "#ff6ec7", textShadow: "0 0 7px #ff6ec7,0 0 10px #ff6ec7,0 0 21px #ff6ec7,0 0 42px #ff1493", letterSpacing: 3 },
  },
  {
    id: "retro",
    label: "Retrô",
    css: "font-size:36px;font-weight:900;text-align:center;color:#e17055;text-shadow:4px 4px 0 #fdcb6e;letter-spacing:4px;text-transform:uppercase;",
    preview: { fontSize: 28, fontWeight: 900, color: "#e17055", textShadow: "4px 4px 0 #fdcb6e", letterSpacing: 4, textTransform: "uppercase" as const },
  },
  {
    id: "metallic",
    label: "Metálico",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(180deg,#ccc 0%,#666 40%,#ccc 50%,#999 60%,#ccc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(180deg,#ccc 0%,#666 40%,#ccc 50%,#999 60%,#ccc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 },
  },
  {
    id: "gold",
    label: "Dourado",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(180deg,#BF953F 0%,#FCF6BA 30%,#B38728 50%,#FBF5B7 70%,#AA771C 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(180deg,#BF953F 0%,#FCF6BA 30%,#B38728 50%,#FBF5B7 70%,#AA771C 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 },
  },
  {
    id: "emboss",
    label: "Alto-relevo",
    css: "font-size:36px;font-weight:900;text-align:center;color:#dfe6e9;text-shadow:1px 1px 1px #fff,-1px -1px 1px #636e72;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, color: "#dfe6e9", textShadow: "1px 1px 1px #fff, -1px -1px 1px #636e72", letterSpacing: 2 },
  },
  {
    id: "gradient-rainbow",
    label: "Arco-íris",
    css: "font-size:36px;font-weight:900;text-align:center;background:linear-gradient(90deg,#ff0000,#ff8800,#ffff00,#00ff00,#0088ff,#8800ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;",
    preview: { fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg,#ff0000,#ff8800,#ffff00,#00ff00,#0088ff,#8800ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 2 },
  },
];

interface WordArtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

export function WordArtDialog({ open, onOpenChange, onInsert }: WordArtDialogProps) {
  const [text, setText] = useState("WordArt");
  const [selectedStyle, setSelectedStyle] = useState<string>("gradient-blue");

  const handleInsert = () => {
    if (!text.trim()) return;
    const style = wordArtStyles.find((s) => s.id === selectedStyle);
    if (!style) return;
    onInsert(`<p style="${style.css}">${text}</p>`);
    onOpenChange(false);
    setText("WordArt");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inserir WordArt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite seu texto..."
            className="text-base"
            autoFocus
          />

          {/* Preview */}
          <div className="border border-border rounded-lg p-6 bg-background min-h-[60px] flex items-center justify-center">
            <span style={wordArtStyles.find((s) => s.id === selectedStyle)?.preview}>
              {text || "WordArt"}
            </span>
          </div>

          {/* Style Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {wordArtStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={cn(
                  "relative border rounded-lg p-3 h-16 flex items-center justify-center transition-all hover:scale-105",
                  selectedStyle === style.id
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
                title={style.label}
              >
                <span style={{ ...style.preview, fontSize: 16, letterSpacing: 1 }}>Aa</span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInsert} disabled={!text.trim()}>
            Inserir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
