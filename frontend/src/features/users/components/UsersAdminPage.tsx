import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserRole, type UserSummary } from '../api/users-api';
import { useAuthStore } from '@/stores/use-auth-store';
import {
  Users,
  Shield,
  Sparkles,
  User,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const USERS_QUERY_KEY = ['adminUsers'] as const;

export function UsersAdminPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: usersApi.getAll,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: number; newRole: UserRole }) =>
      usersApi.changeRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      setFeedback({ type: 'success', message: 'Rol de usuario actualizado con éxito' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setFeedback({
        type: 'error',
        message: errorObj.response?.data?.detail ?? errorObj.message ?? 'Error al actualizar el rol',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => usersApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      setFeedback({ type: 'success', message: 'Usuario eliminado correctamente' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setFeedback({
        type: 'error',
        message: errorObj.response?.data?.detail ?? errorObj.message ?? 'Error al eliminar usuario',
      });
    },
  });

  const handleRoleChange = (user: UserSummary, newRole: UserRole) => {
    if (user.role === newRole) return;
    if (user.username === currentUser?.username && newRole !== 'ROLE_ADMIN') {
      const confirmSelfDemote = window.confirm(
        '¿Seguro que deseas revocar tus propios privilegios de Administrador? Perderás acceso a este panel.'
      );
      if (!confirmSelfDemote) return;
    }
    roleMutation.mutate({ userId: user.id, newRole });
  };

  const handleDelete = (user: UserSummary) => {
    if (user.username === currentUser?.username) {
      alert('Por seguridad no puedes eliminar tu propia cuenta activa de administrador.');
      return;
    }
    const confirmed = window.confirm(
      `¿Deseas eliminar definitivamente al usuario "${user.username}"? Se revocarán todas sus sesiones y mocks.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return {
          icon: <Shield className="h-3 w-3 text-purple-400" />,
          classes: 'bg-purple-950/60 border-purple-800 text-purple-300',
          label: 'Administrador',
        };
      case 'ROLE_GUEST':
        return {
          icon: <Sparkles className="h-3 w-3 text-amber-400" />,
          classes: 'bg-amber-950/60 border-amber-800 text-amber-300',
          label: 'Invitado',
        };
      case 'ROLE_USER':
      default:
        return {
          icon: <User className="h-3 w-3 text-indigo-400" />,
          classes: 'bg-indigo-950/60 border-indigo-800 text-indigo-300',
          label: 'Usuario',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-purple-400" />
            Administración de Usuarios
          </h1>
          <p className="text-xs text-slate-400">
            Control de cuentas, asignación de roles RBAC y gestión de accesos
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Contenedor principal de la tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Cargando lista de usuarios registrados...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-rose-400">
            {error instanceof Error ? error.message : 'Error al cargar los usuarios'}
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No hay usuarios registrados en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Rol Actual</th>
                  <th className="py-3 px-3">Asignar Rol</th>
                  <th className="py-3 px-3">Fecha de Registro</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {users.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  const isSelf = u.username === currentUser?.username;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400">#{u.id}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-800 border border-slate-700 text-indigo-300 px-1.5 py-0.5 rounded">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleBadge.classes}`}
                        >
                          {roleBadge.icon}
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <label htmlFor={`role-select-${u.id}`} className="sr-only">
                          Cambiar rol de {u.username}
                        </label>
                        <select
                          id={`role-select-${u.id}`}
                          aria-label={`Cambiar rol de ${u.username}`}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          disabled={roleMutation.isPending}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-medium"
                        >
                          <option value="ROLE_USER">ROLE_USER (Estándar)</option>
                          <option value="ROLE_ADMIN">ROLE_ADMIN (Administrador)</option>
                          <option value="ROLE_GUEST">ROLE_GUEST (Invitado)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf || deleteMutation.isPending}
                          className={`p-1.5 rounded-lg border transition-colors inline-flex items-center gap-1 text-xs ${
                            isSelf
                              ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-900 text-rose-300'
                          }`}
                          title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
