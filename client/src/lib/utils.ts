import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  judicial: { label: "司法内容", color: "oklch(46% 0.22 245)" },
  regulatory: { label: "监管执法", color: "oklch(48% 0.18 162)" },
  legislation: { label: "立法政策", color: "oklch(54% 0.18 55)" },
};

export const TYPE_BADGE_CLASS: Record<string, string> = {
  judicial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  regulatory: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  legislation: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}
