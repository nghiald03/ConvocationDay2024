'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  setUserPassword,
  updateUser,
  type ManagedUser,
} from '@/features/admin/api/manage-users';
import { useSession } from '@/features/auth/queries/session-provider';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';

const usersKey = ['admin', 'users'] as const;
const MIN_PASSWORD = 12;

type UserForm = {
  user: ManagedUser | null;
  email: string;
  name: string;
  password: string;
  roles: string[];
};

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useSession();
  const { data: users = [], isLoading } = useQuery({ queryKey: usersKey, queryFn: getUsers });
  const { data: roles = [] } = useQuery({ queryKey: ['admin', 'roles'], queryFn: getRoles, staleTime: Infinity });
  const [form, setForm] = React.useState<UserForm | null>(null);
  const [passwordFor, setPasswordFor] = React.useState<{ user: ManagedUser; password: string } | null>(null);
  const [search, setSearch] = React.useState('');

  const roleName = (code: string) => roles.find((role) => role.code === code)?.name ?? code;
  const refresh = () => queryClient.invalidateQueries({ queryKey: usersKey });
  const onError = (fallback: string) => (error: unknown) => toast.error(getHttpErrorMessage(error, fallback));

  const filtered = users.filter((user) => {
    const term = search.trim().toLowerCase();
    return !term || user.email.toLowerCase().includes(term) || user.name.toLowerCase().includes(term);
  });

  const save = useMutation({
    mutationFn: (value: UserForm) =>
      value.user
        ? updateUser(value.user.id, { name: value.name.trim(), roles: value.roles })
        : createUser({ email: value.email.trim(), name: value.name.trim(), password: value.password, roles: value.roles }),
    onSuccess: (_result, value) => {
      toast.success(value.user ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản.');
      setForm(null);
      void refresh();
    },
    onError: onError('Lưu tài khoản thất bại.'),
  });

  const toggleDisabled = useMutation({
    mutationFn: (user: ManagedUser) => updateUser(user.id, { disabled: !user.disabled }),
    onSuccess: (user) => {
      toast.success(user.disabled ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      void refresh();
    },
    onError: onError('Không thể đổi trạng thái tài khoản.'),
  });

  const changePassword = useMutation({
    mutationFn: ({ user, password }: { user: ManagedUser; password: string }) => setUserPassword(user.id, password),
    onSuccess: () => {
      toast.success('Đã đặt mật khẩu mới. Các phiên đăng nhập cũ của tài khoản này đã bị đăng xuất.');
      setPasswordFor(null);
      void refresh();
    },
    onError: onError('Đặt mật khẩu thất bại.'),
  });

  const remove = useMutation({
    mutationFn: (user: ManagedUser) => deleteUser(user.id),
    onSuccess: () => {
      toast.success('Đã xóa tài khoản.');
      void refresh();
    },
    onError: onError('Xóa tài khoản thất bại.'),
  });

  const confirmDelete = async (user: ManagedUser) => {
    const confirmed = await swal({
      title: `Xóa tài khoản ${user.email}?`,
      text: 'Tài khoản sẽ bị xóa vĩnh viễn. Nếu chỉ muốn tạm ngừng, hãy dùng nút Khóa.',
      icon: 'warning',
      buttons: ['Hủy', 'Xóa'],
      dangerMode: true,
    });
    if (confirmed) remove.mutate(user);
  };

  const formValid =
    form !== null &&
    form.name.trim().length > 0 &&
    form.roles.length > 0 &&
    (form.user !== null || (form.email.includes('@') && form.password.length >= MIN_PASSWORD));

  return (
    <Card>
      <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
        <CardTitle>Quản lý tài khoản</CardTitle>
        <div className='flex flex-wrap gap-2'>
          <Input
            className='w-64'
            placeholder='Tìm theo email hoặc tên…'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            onClick={() => setForm({ user: null, email: '', name: '', password: generatePassword(), roles: ['CK'] })}
          >
            Thêm tài khoản
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className='w-32'>Trạng thái</TableHead>
              <TableHead className='text-right'>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <TableRow key={user.id}>
                  <TableCell className='font-medium'>
                    {user.email}
                    {isSelf && <span className='ml-2 text-xs text-muted-foreground'>(bạn)</span>}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <div className='flex flex-wrap gap-1'>
                      {user.roles.map((role) => (
                        <Badge key={role} color={role === 'MN' ? 'primary' : 'secondary'} title={roleName(role)}>
                          {role} · {roleName(role)}
                        </Badge>
                      ))}
                      {!user.roles.length && <span className='text-muted-foreground'>—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.disabled ? (
                      <Badge color='destructive'>Đã khóa</Badge>
                    ) : user.lockedUntil ? (
                      <Badge color='warning' title='Nhập sai mật khẩu quá nhiều lần'>
                        Tạm khóa đến {new Date(user.lockedUntil).toLocaleTimeString()}
                      </Badge>
                    ) : (
                      <Badge color='success'>Hoạt động</Badge>
                    )}
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    <div className='inline-flex flex-wrap justify-end gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setForm({ user, email: user.email, name: user.name, password: '', roles: user.roles })}
                      >
                        Sửa
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setPasswordFor({ user, password: generatePassword() })}
                      >
                        Đặt mật khẩu
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        color={user.disabled ? 'success' : 'warning'}
                        disabled={isSelf || toggleDisabled.isPending}
                        onClick={() => toggleDisabled.mutate(user)}
                      >
                        {user.disabled ? 'Mở khóa' : 'Khóa'}
                      </Button>
                      <Button
                        size='sm'
                        color='destructive'
                        disabled={isSelf || remove.isPending}
                        onClick={() => void confirmDelete(user)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5} className='text-center text-muted-foreground'>
                  {isLoading ? 'Đang tải…' : 'Không có tài khoản nào.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.user ? 'Sửa tài khoản' : 'Thêm tài khoản'}</DialogTitle>
            {form?.user && (
              <DialogDescription>
                Đổi vai trò sẽ đăng xuất tài khoản này khỏi mọi thiết bị để quyền mới có hiệu lực ngay.
              </DialogDescription>
            )}
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (form && formValid) save.mutate(form);
            }}
          >
            <div className='space-y-2'>
              <Label htmlFor='user-email'>Email đăng nhập</Label>
              <Input
                id='user-email'
                type='email'
                disabled={form?.user !== null}
                value={form?.email ?? ''}
                onChange={(event) => setForm((current) => current && { ...current, email: event.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='user-name'>Họ tên</Label>
              <Input
                id='user-name'
                maxLength={200}
                value={form?.name ?? ''}
                onChange={(event) => setForm((current) => current && { ...current, name: event.target.value })}
              />
            </div>
            {form?.user === null && (
              <PasswordField
                id='user-password'
                value={form.password}
                onChange={(password) => setForm((current) => current && { ...current, password })}
              />
            )}
            <div className='space-y-2'>
              <Label>Vai trò</Label>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                {roles.map((role) => (
                  <label key={role.code} className='flex cursor-pointer items-center gap-2 text-sm'>
                    <Checkbox
                      checked={form?.roles.includes(role.code) ?? false}
                      onCheckedChange={(checked) =>
                        setForm(
                          (current) =>
                            current && {
                              ...current,
                              roles: checked
                                ? [...current.roles, role.code]
                                : current.roles.filter((code) => code !== role.code),
                            }
                        )
                      }
                    />
                    <span>
                      <span className='font-semibold'>{role.code}</span> · {role.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setForm(null)}>
                Hủy
              </Button>
              <Button type='submit' disabled={save.isPending || !formValid}>
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordFor !== null} onOpenChange={(open) => !open && setPasswordFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt mật khẩu mới</DialogTitle>
            <DialogDescription>
              {passwordFor?.user.email} sẽ bị đăng xuất khỏi mọi thiết bị. Gửi mật khẩu mới cho người dùng qua kênh riêng.
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (passwordFor && passwordFor.password.length >= MIN_PASSWORD) changePassword.mutate(passwordFor);
            }}
          >
            <PasswordField
              id='reset-password'
              value={passwordFor?.password ?? ''}
              onChange={(password) => setPasswordFor((current) => current && { ...current, password })}
            />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setPasswordFor(null)}>
                Hủy
              </Button>
              <Button
                type='submit'
                disabled={changePassword.isPending || (passwordFor?.password.length ?? 0) < MIN_PASSWORD}
              >
                {changePassword.isPending ? 'Đang lưu…' : 'Đặt mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PasswordField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = React.useState(true);
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>Mật khẩu (tối thiểu {MIN_PASSWORD} ký tự)</Label>
      <div className='flex gap-2'>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete='new-password'
          maxLength={128}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type='button' variant='outline' onClick={() => onChange(generatePassword())}>
          Tạo ngẫu nhiên
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            // The Clipboard API only exists on HTTPS/localhost; over plain HTTP select the text instead.
            if (navigator.clipboard) {
              void navigator.clipboard.writeText(value).then(() => toast.success('Đã sao chép mật khẩu.'));
              return;
            }
            const input = document.getElementById(id) as HTMLInputElement | null;
            input?.select();
            toast('Đã chọn mật khẩu, nhấn Ctrl+C để sao chép.');
          }}
        >
          Sao chép
        </Button>
      </div>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Switch id={`${id}-visible`} checked={visible} onCheckedChange={setVisible} />
        <Label htmlFor={`${id}-visible`} className='cursor-pointer font-normal'>
          Hiện mật khẩu
        </Label>
      </div>
      {value.length > 0 && value.length < MIN_PASSWORD && (
        <p className='text-sm text-destructive'>Mật khẩu cần ít nhất {MIN_PASSWORD} ký tự.</p>
      )}
    </div>
  );
}
