import { httpClient } from './client';

export const API_HEALTH_PATH = '/health/ready';

export interface ApiHealth {
  status: 'ready';
  dependencies: {
    postgres: 'ok';
    minio: 'ok';
  };
}

export async function getApiHealth() {
  const response = await httpClient.get<ApiHealth>(API_HEALTH_PATH);
  return response.data;
}
