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
      navigate('/mocks');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setError(
        errorObj.response?.data?.detail ||
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
      navigate('/mocks');
    } catch {
      setError('No se pudo generar la sesión de invitado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-foreground transition-colors duration-200">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6 text-card-foreground">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mocking Engine Studio</h1>
          <p className="text-sm text-muted-foreground">Simulador dinámico de APIs y control de estados</p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-xs font-medium text-foreground">
              Usuario
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-foreground">
              Contraseña
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
            className="text-xs text-primary hover:underline transition-colors cursor-pointer"
          >
            {isRegisterMode
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">¿Solo quieres probar?</span>
          </div>
        </div>

        {/* Botón de acceso 1-Click como Invitado */}
        <button
          onClick={handleGuestAccess}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-secondary hover:bg-muted border border-border text-foreground font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          Entrar como Invitado (Sandbox 24h)
        </button>
      </div>
    </div>
  );
}

