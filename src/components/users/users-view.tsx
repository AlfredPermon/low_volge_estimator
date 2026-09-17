'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users as UsersIcon,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  Pencil,
  Power,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  User,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'Seguridad electrónica' | 'Seguridad Industrial' | 'Medio Ambiente' | string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
}

const ROLES_LIST = [
  { value: 'admin', label: 'Admin (Control Total)' },
  { value: 'Seguridad electrónica', label: 'Seguridad Electrónica' },
  { value: 'Seguridad Industrial', label: 'Seguridad Industrial' },
  { value: 'Medio Ambiente', label: 'Medio Ambiente' },
];

export default function UsersView() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0, adminUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Seguridad electrónica',
    active: true,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Seguridad electrónica',
    active: true,
  });

  // ─── Fetch users list ──────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.status === 403) {
        toast.error('Acceso denegado: Únicamente el perfil admin tiene permiso para gestionar usuarios.');
        setUsers([]);
        return;
      }

      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalRecords(json.pagination?.total || 0);
        if (json.stats) setStats(json.stats);
      } else {
        toast.error('Error al cargar la lista de usuarios');
      }
    } catch {
      toast.error('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  // ─── Create User Handler ───────────────────────────────────────────────
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al crear usuario');
        return;
      }

      toast.success(`Usuario ${data.name} creado exitosamente`);
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'Seguridad electrónica', active: true });
      fetchUsers();
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit User Open Handler ───────────────────────────────────────────
  const handleOpenEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    setIsEditOpen(true);
  };

  // ─── Edit User Submit Handler ─────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const bodyPayload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        active: editForm.active,
      };

      if (editForm.password && editForm.password.trim().length > 0) {
        bodyPayload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al actualizar usuario');
        return;
      }

      toast.success(`Usuario ${data.name} actualizado correctamente`);
      setIsEditOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast.error('Error al actualizar la información');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle Active Status Handler ─────────────────────────────────────
  const handleToggleStatus = async (user: UserRecord) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al cambiar el estado del usuario');
        return;
      }

      toast.success(data.message || `Estado de ${user.name} actualizado`);
      fetchUsers();
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Helper for role badge colors
  const getRoleBadge = (role: string) => {
    const r = (role || '').trim().toLowerCase();
    if (r === 'admin' || r === 'administrador') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold gap-1"><ShieldCheck className="w-3 h-3" /> Admin</Badge>;
    }
    if (r === 'seguridad electrónica' || r === 'electronica') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium">Seguridad Electrónica</Badge>;
    }
    if (r === 'seguridad industrial' || r === 'industrial') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium">Seguridad Industrial</Badge>;
    }
    if (r === 'medio ambiente' || r === 'ambiente') {
      return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 font-medium">Medio Ambiente</Badge>;
    }
    return <Badge variant="secondary" className="text-stone-600">{role}</Badge>;
  };

  // Helper for user initials avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── Header Title & Actions ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 text-white">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800 tracking-tight">Gestión de Usuarios</h2>
            <p className="text-xs text-stone-500">Control de accesos y perfiles del sistema Low-Voltage Estimator</p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20 gap-2 h-10 rounded-xl"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {/* ── Summary Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Total Usuarios</p>
              <p className="text-2xl font-bold text-stone-800 mt-0.5">{stats.totalUsers}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <UsersIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Usuarios Activos</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.activeUsers}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Cuentas Inactivas</p>
              <p className="text-2xl font-bold text-stone-500 mt-0.5">{stats.inactiveUsers}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <UserX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-medium">Administradores</p>
              <p className="text-2xl font-bold text-stone-800 mt-0.5">{stats.adminUsers}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Buscar por nombre o correo electrónico…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-10 border-stone-200 focus-visible:ring-emerald-500"
              />
            </div>

            {/* Role Filter Select */}
            <div className="w-full sm:w-56">
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="h-10 border-stone-200">
                  <SelectValue placeholder="Filtrar por perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los perfiles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="Seguridad electrónica">Seguridad Electrónica</SelectItem>
                  <SelectItem value="Seguridad Industrial">Seguridad Industrial</SelectItem>
                  <SelectItem value="Medio Ambiente">Medio Ambiente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Select */}
            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-10 border-stone-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="h-10 text-stone-600 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Users List Table ────────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Correo Electrónico</th>
                <th className="py-3.5 px-4">Perfil Asignado</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Fecha Registro</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-28" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-400">
                    <UsersIcon className="w-12 h-12 mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">No se encontraron usuarios</p>
                    <p className="text-xs text-stone-400 mt-0.5">Intenta cambiar los parámetros de búsqueda o filtros</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* User Avatar + Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shadow-xs">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800 leading-tight">{u.name}</p>
                          <p className="text-[11px] text-stone-400 sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-stone-600 text-xs font-mono">
                      {u.email}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                          Inactivo
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-xs text-stone-500">
                      {new Date(u.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(u)}
                          title="Editar usuario"
                          className="h-8 w-8 p-0 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          title={u.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                          className={`h-8 w-8 p-0 ${
                            u.active
                              ? 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-stone-50/60 border-t border-stone-200 flex items-center justify-between">
          <p className="text-xs text-stone-500 font-medium">
            Mostrando <span className="text-stone-800 font-semibold">{users.length}</span> de <span className="text-stone-800 font-semibold">{totalRecords}</span> usuarios
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </Button>
            <span className="text-xs font-semibold text-stone-700 px-2">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs gap-1"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Dialog: Create User ─────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-800">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Ingresa los datos para dar de alta una cuenta y asignar un perfil de acceso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" /> Nombre Completo *
              </Label>
              <Input
                placeholder="Ej: Ing. Carlos Mendoza"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-emerald-600" /> Correo Electrónico *
              </Label>
              <Input
                type="email"
                placeholder="carlos.mendoza@prisa.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> Contraseña Inicial *
              </Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                minLength={6}
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Perfil de Acceso (Rol) *</Label>
              <Select
                value={createForm.role}
                onValueChange={(val) => setCreateForm({ ...createForm, role: val })}
              >
                <SelectTrigger className="h-10 border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_LIST.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div>
                <p className="text-xs font-semibold text-stone-800">Estado de Cuenta</p>
                <p className="text-[11px] text-stone-500">Permitir inicio de sesión de forma inmediata</p>
              </div>
              <Switch
                checked={createForm.active}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, active: checked })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Guardar Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit User ───────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-800">
              <Pencil className="w-5 h-5 text-emerald-600" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Modifica la información personal, perfil asignado o actualiza la contraseña de acceso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Nombre Completo *</Label>
              <Input
                placeholder="Nombre de usuario"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Correo Electrónico *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Cambiar Contraseña <span className="text-stone-400 font-normal">(Dejar en blanco para mantener la actual)</span>
              </Label>
              <Input
                type="password"
                placeholder="Nueva contraseña opcional"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="h-10 border-stone-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Perfil de Acceso (Rol)</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm({ ...editForm, role: val })}
              >
                <SelectTrigger className="h-10 border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_LIST.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div>
                <p className="text-xs font-semibold text-stone-800">Estado de Cuenta</p>
                <p className="text-[11px] text-stone-500">
                  {editForm.active ? 'Cuenta habilitada en el sistema' : 'Cuenta inhabilitada'}
                </p>
              </div>
              <Switch
                checked={editForm.active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, active: checked })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Actualizar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
