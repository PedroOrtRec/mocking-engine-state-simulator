interface Props {
  method: string;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  POST: 'bg-blue-950 text-blue-400 border-blue-800',
  PUT: 'bg-amber-950 text-amber-400 border-amber-800',
  PATCH: 'bg-purple-950 text-purple-400 border-purple-800',
  DELETE: 'bg-rose-950 text-rose-400 border-rose-800',
};

export function HttpMethodBadge({ method }: Props) {
  const style = METHOD_STYLES[method.toUpperCase()] || 'bg-slate-800 text-slate-400 border-slate-700';
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${style}`}>
      {method.toUpperCase()}
    </span>
  );
}
