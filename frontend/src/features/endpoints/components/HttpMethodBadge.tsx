interface Props {
  method: string;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-800 dark:bg-emerald-950/60',
  POST: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-800 dark:bg-blue-950/60',
  PUT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-800 dark:bg-amber-950/60',
  PATCH: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-800 dark:bg-purple-950/60',
  DELETE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-800 dark:bg-rose-950/60',
};

export function HttpMethodBadge({ method }: Props) {
  const style = METHOD_STYLES[method.toUpperCase()] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${style}`}>
      {method.toUpperCase()}
    </span>
  );
}
