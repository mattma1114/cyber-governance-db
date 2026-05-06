import { useAppTheme, DarkMode, FontStyle, Density } from "@/contexts/AppThemeContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SunMedium, Moon, Monitor, Palette, Type, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const DARK_MODES: { id: DarkMode; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "浅色", icon: <SunMedium className="w-4 h-4" /> },
  { id: "dark", label: "深色", icon: <Moon className="w-4 h-4" /> },
  { id: "system", label: "跟随系统", icon: <Monitor className="w-4 h-4" /> },
];

const FONTS: { id: FontStyle; label: string; preview: string }[] = [
  { id: "serif", label: "衬线体（默认）", preview: "Aa 治理" },
  { id: "sans", label: "无衬线体", preview: "Aa 治理" },
];

const DENSITIES: { id: Density; label: string }[] = [
  { id: "compact", label: "紧凑" },
  { id: "default", label: "标准" },
  { id: "airy", label: "宽松" },
];

export function ThemePanel() {
  const { darkMode, fontStyle, density, setDarkMode, setFontStyle, setDensity } = useAppTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" title="显示设置">
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          {/* Dark Mode */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5" /> 明暗模式
            </p>
            <div className="flex gap-2">
              {DARK_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDarkMode(m.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all text-xs",
                    darkMode === m.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Font */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> 字体风格
            </p>
            <div className="flex gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontStyle(f.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border-2 transition-all text-xs text-center",
                    fontStyle === f.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground",
                    f.id === "serif" ? "font-serif" : "font-sans"
                  )}
                >
                  <div className="text-sm font-medium">{f.preview}</div>
                  <div className="text-[10px] mt-0.5">{f.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Density */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" /> 信息密度
            </p>
            <div className="flex gap-2">
              {DENSITIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDensity(d.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border-2 transition-all text-xs text-center",
                    density === d.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
