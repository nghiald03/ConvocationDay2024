import { httpClient } from './client';

export async function getApiHealth() {
  const response = await httpClient.get('/Test/Connect');
  return response.data;
}
