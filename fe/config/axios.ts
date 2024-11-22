import { Bachelor } from '@/dtos/BachelorDTO';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api`
  : 'http://fjourney.site:85/api';
console.log('env', process.env.NEXT_PUBLIC_SITE_URL);
console.log('base', process.env.API_URL);

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL + '/api'
    : 'http://fjourney.site:85/api',
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
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
    return await axios.post(BASE_URL + '/Auth/Login', user);
  },
};

export const ledAPI = {
  getHallList: async () => {
    return await axiosInstance.get('/Hall/GetAll');
  },
  getSessionList: async () => {
    return await axiosInstance.get('/Session/GetAll');
  },
  getBachelor1st: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelor1st?hall=${hall}&session=${session}`
    );
  },
  getBachelorNext: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorNext?hall=${hall}&session=${session}`
    );
  },
  getBachelorCurrent: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorCurrent?hall=${hall}&session=${session}`
    );
  },
  getBachelorBack: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorBack?hall=${hall}&session=${session}`
    );
  },
};

export const testing = {
  connect: async () => {
    return await axios.get(BASE_URL + '/Test/Connect');
  },
};

type Pagination = {
  pageIndex: number;
  pageSize: number;
  search?: string;
  hall?: string;
  session?: string;
};

export const checkinAPI = {
  getBachelorList: async (data: Pagination) => {
    const params = new URLSearchParams({
      pageIndex: data.pageIndex.toString(),
      pageSize: data.pageSize.toString(),
    });
    console.log('data', data);

    // Thêm các tham số tuỳ chọn nếu tồn tại
    if (data.search) params.append('keySearch', data.search);
    if (data.hall) params.append('hallId', data.hall);
    if (data.session) params.append('sessionId', data.session);

    return await axiosInstance.get('/Bachelor/GetAll?' + params.toString());
  },
  checkin: async (data: any) => {
    return await axiosInstance.put('/Checkin/UpdateCheckin', data);
  },
  getLocation: async (data: any) => {
    console.log(BASE_URL + '/Checkin/GetLocation');
    return await axiosInstance.get(
      `/Bachelor/search?keySearch=${data}&pageIndex=1&pageSize=1000`
    );
  },
};

export const manageAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get('/Bachelor/GetAll');
  },
  addBachelor: async (data: Bachelor[]) => {
    return await axiosInstance.post('/Bachelor/Add', data);
  },
  deleteBachelor: async (studentCode: string) => {
    return await axiosInstance.delete(`/Bachelor/Delete/${studentCode}`);
  },
  updateBachelor: async (data: Bachelor) => {
    return await axiosInstance.put('/Bachelor/Update', data);
  },
  uploadImage: async (data: FormData) => {
    return await axios.post('http://fjourney.site:3214/upload', data);
  },
  getCheckinList: async () => {
    return await axiosInstance.get('/Checkin/GetAllStatusCheckin');
  },
  updateStatusCheckin: async (data: any) => {
    return await axiosInstance.put('/Checkin/UpdateStatusCheckin', data);
  },
};
