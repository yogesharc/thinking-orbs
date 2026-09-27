import { Moon, Sun } from "lucide-react";

/** Two-segment switch with a sliding thumb, like macOS's appearance picker. */
export function ThemeSwitch({ mode, onChange }: { mode: "dark" | "light"; onChange: (m: "dark" | "light") => void }) {
  const opts = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
  ] as const;

  return (
    <div role="radiogroup" aria-label="Appearance" className="relative flex rounded-full bg-foreground/[0.07] p-0.5">
      <span
        className="absolute top-0.5 bottom-0.5 left-0.5 w-9 rounded-full bg-(--knob) shadow-[0_1px_3px_rgb(0_0_0/0.2),0_0_0_0.5px_rgb(0_0_0/0.06)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${mode === "dark" ? "100%" : "0"})` }}
      />
      {opts.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          aria-label={label}
          onClick={() => onChange(id)}
          className={`relative flex h-7 w-9 items-center justify-center rounded-full transition-colors ${mode === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon className="size-3.5" strokeWidth={2.25} />
        </button>
      ))}
    </div>
  );
}
