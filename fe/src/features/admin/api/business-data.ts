import { httpClient } from '@/lib/http/client';

export type BusinessDataSummary = {
  database: string;
  tables: { name: string; rows: number }[];
};

export async function getBusinessData() {
  return (await httpClient.get<BusinessDataSummary>('/Database/business-data')).data;
}

// `confirmation` must be `CLEAR <database name>`; the server rejects anything else.
export async function clearBusinessData(confirmation: string) {
  const response = await httpClient.post<{ message: string }>('/Database/clear-business-data', undefined, {
    headers: { 'X-Confirm-Destructive': confirmation },
  });
  return response.data;
}
