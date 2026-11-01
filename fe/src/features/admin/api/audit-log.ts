import { httpClient } from '@/lib/http/client';

export type AuditEvent = {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditPage = {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getAuditEvents(params: { page: number; pageSize: number; q?: string }) {
  return (
    await httpClient.get<AuditPage>('/Audit', {
      params: { page: params.page, pageSize: params.pageSize, q: params.q || undefined },
    })
  ).data;
}
