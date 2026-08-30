export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  roles: string[];
  permissions: string[];
};
