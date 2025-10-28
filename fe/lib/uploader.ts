import axios from 'axios';

export const uploader = axios.create({
  baseURL: process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || '', // chính app Next của anh
});

uploader.interceptors.request.use((config) => {
  const key =
    typeof window !== 'undefined'
      ? localStorage.getItem('UPLOAD_API_KEY') ||
        process.env.NEXT_PUBLIC_UPLOAD_API_KEY ||
        ''
      : process.env.NEXT_PUBLIC_UPLOAD_API_KEY || '';
  if (key) {
    config.headers['x-api-key'] = key;
  }
  return config;
});
