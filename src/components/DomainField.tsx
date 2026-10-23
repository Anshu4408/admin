import { useState } from 'react';
import { standardDomains } from '../lib/eventOperations';
export function DomainField({ value, onChange, id = 'team-domain' }: { value: string; onChange: (domain: string) => void; id?: string }) {
  const [custom, setCustom] = useState(!!value && !standardDomains.includes(value));
  return <div className="space-y-2">
    <select id={id} value={custom ? '__custom' : value} onChange={e => { const next = e.target.value; setCustom(next === '__custom'); onChange(next === '__custom' ? '' : next); }} className="min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs" required>
      <option value="" disabled>Choose domain</option>
      {standardDomains.map(domain => <option key={domain} value={domain}>{domain}</option>)}
      <option value="__custom">Other / custom domain</option>
    </select>
    {custom && <input aria-label="Custom domain" value={value} onChange={e => onChange(e.target.value.toLowerCase())} maxLength={64} required placeholder="Enter custom domain" className="min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs" />}
  </div>;
}
