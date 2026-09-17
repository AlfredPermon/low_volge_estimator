'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Asegurar que la base de datos tenga usuarios iniciales de demostración
  useEffect(() => {
    fetch('/api/auth/seed-admin', { method: 'POST' }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al iniciar sesión');
        return;
      }

      toast.success(`¡Bienvenido de nuevo, ${data.user.name}!`);
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Error de conexión con el servidor de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    try {
      await fetch('/api/auth/seed-admin', { method: 'POST' });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Autenticado como ${data.user.name} (${data.user.role})`);
        router.push('/');
        router.refresh();
      } else {
        toast.error(data.error || 'Error al iniciar sesión demo');
      }
    } catch {
      toast.error('Error al procesar login de demostración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-stone-900 text-stone-100 relative overflow-hidden p-4">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/30 mb-2">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Low-Voltage Estimator</h1>
          <p className="text-sm text-stone-400">Plataforma de Estimaciones & Cotizaciones Especiales</p>
        </div>

        {/* Card Login Form */}
        <Card className="border-stone-800 bg-stone-900/90 backdrop-blur-md shadow-2xl rounded-2xl text-stone-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-stone-400 text-xs">
              Ingresa tus credenciales de la base de datos Prisa
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-500" /> Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@prisa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-emerald-500 h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-500" /> Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-emerald-500 h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 shadow-lg shadow-emerald-600/20 rounded-xl gap-2 transition-all mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Verificando...' : 'Acceder al Sistema'}
              </Button>
            </form>
          </CardContent>

          {/* Quick Demo Logins for Fast Access */}
          <CardFooter className="flex flex-col space-y-3 pt-2 border-t border-stone-800/60">
            <p className="text-xs text-stone-400 text-center font-medium">Acceso rápido con usuarios de prueba:</p>
            <div className="grid grid-cols-3 gap-2 w-full text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('admin@prisa.com', 'Admin123!')}
                className="border-stone-800 bg-stone-950/60 hover:bg-emerald-950/50 hover:border-emerald-700 text-stone-300 text-[11px] px-1 py-2 h-auto flex-col gap-0.5"
              >
                <span className="font-bold text-emerald-400">Admin</span>
                <span className="text-[9px] text-stone-500">Acceso Total</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('supervisor@prisa.com', 'Super123!')}
                className="border-stone-800 bg-stone-950/60 hover:bg-amber-950/50 hover:border-amber-700 text-stone-300 text-[11px] px-1 py-2 h-auto flex-col gap-0.5"
              >
                <span className="font-bold text-amber-400">Supervisor</span>
                <span className="text-[9px] text-stone-500">Gestión Global</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('operador@prisa.com', 'Operador123!')}
                className="border-stone-800 bg-stone-950/60 hover:bg-blue-950/50 hover:border-blue-700 text-stone-300 text-[11px] px-1 py-2 h-auto flex-col gap-0.5"
              >
                <span className="font-bold text-blue-400">Operativo</span>
                <span className="text-[9px] text-stone-500">Cotizador</span>
              </Button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Base de Datos Prisa • Seguridad de Grado Empresarial</span>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Low-Voltage Estimator. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
