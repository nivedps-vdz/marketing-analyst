"use client";

import { Select } from "@/components/ui/Select";
import { useClients } from "@/lib/queries";

export function ClientFilter({ value, onChange }: { value: number | null; onChange: (id: string | null) => void }) {
  const clients = useClients();
  return (
    <Select label="Client" className="min-w-[220px]" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">All clients</option>
      {clients.data?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  );
}
