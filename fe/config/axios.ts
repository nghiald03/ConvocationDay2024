import { Bachelor } from '@/dtos/BachelorDTO';
import axios from 'axios';

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem('url');
    return url ? url + '/api' : 'http://localhost:3000/api';
  }
  return 'http://localhost:3000/api';
}

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
});

// Thêm một interceptor để cấu hình tiêu đề của mỗi yêu cầu
axiosInstance.interceptors.request.use((config) => {
  // Lấy assetToken từ localStorage
  const accessToken = localStorage.getItem('accessToken');

  // Kiểm tra xem assetToken có tồn tại và không rỗng
  if (accessToken) {
    // Thêm assetToken vào tiêu đề Authorization
    config.headers['Authorization'] = `Bearer ${accessToken}`;
    config.timeout = 10000;
  }

  return config;
});

export type User = {
  userName: string | undefined;
  password: string | undefined;
};

export const loginAPI = {
  login: async (user: User) => {
    const BASE_URL =
      localStorage.getItem('url') + '/api' || 'http://localhost:3000/api';
    return await axios.post(BASE_URL + '/Auth/Login', user);
  },
};

export const ledAPI = {
  getHallList: async () => {
    const BASE_URL =
      localStorage.getItem('url') + '/api' || 'http://localhost:3000/api';
    return await axiosInstance.get('/Hall/GetAll');
  },
  getSessionList: async () => {
    const BASE_URL =
      localStorage.getItem('url') + '/api' || 'http://localhost:3000/api';
    return await axiosInstance.get('/Session/GetAll');
  },
};

export const testing = {
  connect: async () => {
    const BASE_URL =
      localStorage.getItem('url') + '/api' || 'http://localhost:3000/api';
    return await axios.get(BASE_URL + '/Test/Connect');
  },
};

export const checkinAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get('/Bachelor/GetAll');
  },
  checkin: async (data: any) => {
    return await axiosInstance.put('/Checkin/UpdateCheckin', data);
  },
};

export const manageAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get('/Bachelor/GetAll');
  },
  addBachelor: async (data: Bachelor[]) => {
    return await axiosInstance.post('/Bachelor/Add', data);
  },
  uploadImage: async (data: FormData) => {
    return await axios.post('http://localhost:3214/upload', data);
  },
};
