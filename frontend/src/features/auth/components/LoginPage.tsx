import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { authApi } from '../api/auth-api';
import { Sparkles, Lock, User, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = isRegisterMode
        ? await authApi.register({ username, password })
        : await authApi.login({ username, password });
      login(data.token, { username: data.username, role: data.role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          (isRegisterMode ? 'No se pudo completar el registro' : 'Credenciales inválidas')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.guestLogin();
      login(data.token, { username: data.username, role: data.role });
      navigate('/dashboard');
    } catch {
      setError('No se pudo generar la sesión de invitado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Mocking Engine Studio</h1>
          <p className="text-sm text-slate-400">Simulador dinámico de APIs y control de estados</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-xs font-medium text-slate-300">
              Usuario
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading
              ? 'Procesando...'
              : isRegisterMode
              ? 'Crear Cuenta'
              : 'Iniciar Sesión'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode((prev) => !prev);
              setError(null);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isRegisterMode
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">¿Solo quieres probar?</span>
          </div>
        </div>

        {/* Botón de acceso 1-Click como Invitado */}
        <button
          onClick={handleGuestAccess}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          Entrar como Invitado (Sandbox 24h)
        </button>
      </div>
    </div>
  );
}

