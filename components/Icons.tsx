type P = { size?: number; className?: string };
const base = (size = 18) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const Mic = ({ size, className }: P) => (<svg {...base(size)} className={className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
export const Stop = ({ size, className }: P) => (<svg {...base(size)} className={className}><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" /></svg>);
export const Arrow = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const Check = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const Shield = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>);
export const Bolt = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" /></svg>);
export const Wallet = ({ size, className }: P) => (<svg {...base(size)} className={className}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2M3 9h18" /></svg>);
export const Eye = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
export const Power = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M12 3v8M6.3 7a8 8 0 1 0 11.4 0" /></svg>);
export const Wave = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2" /></svg>);
export const Chart = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M4 19h16M7 15l4-4 3 3 5-6" /></svg>);
export const Bell = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0" /></svg>);
export const Speaker = ({ size, className }: P) => (<svg {...base(size)} className={className}><path d="M4 10v4h4l5 4V6L8 10H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>);
export const Github = ({ size = 18, className }: P) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" /></svg>);
