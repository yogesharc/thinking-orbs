import { Moon, Sun, type LucideIcon } from "lucide-react";

/**
 * Segmented switch with a sliding thumb, like macOS's appearance picker. Segments share one width,
 * the widest's; an option with an `Icon` shows the icon and keeps its `label` for screen readers.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "w-fit",
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string; Icon?: LucideIcon }[];
  onChange: (id: T) => void;
  className?: string;
}) {
  const at = options.findIndex((o) => o.id === value);

  return (
    <div role="radiogroup" aria-label={label} className={`relative grid ${className} auto-cols-fr grid-flow-col rounded-xl bg-foreground/[0.07] p-0.5`}>
      <span
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[10px] bg-(--knob) shadow-[0_1px_3px_rgb(0_0_0/0.2),0_0_0_0.5px_rgb(0_0_0/0.06)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${at * 100}%)` }}
      />
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={Icon && label}
          onClick={() => onChange(id)}
          className={`relative flex h-7 items-center justify-center rounded-[10px] text-sm transition-colors ${Icon ? "w-9" : "px-3"} ${value === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {Icon ? <Icon className="size-3.5" strokeWidth={2.25} /> : label}
        </button>
      ))}
    </div>
  );
}

const THEMES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeSwitch({ mode, onChange }: { mode: "dark" | "light"; onChange: (m: "dark" | "light") => void }) {
  return <Segmented label="Appearance" value={mode} options={THEMES} onChange={onChange} />;
}
