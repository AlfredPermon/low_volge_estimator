'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, KeyRound, AlertCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Por favor, ingresa tu correo electrónico y contraseña.');
      toast.error('Campos incompletos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('El formato del correo electrónico no es válido.');
      toast.error('Correo inválido');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
        callbackURL: '/',
      });

      if (error) {
        let friendlyError = 'Credenciales incorrectas o usuario no registrado.';
        if (error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD') {
          friendlyError = 'El correo electrónico o la contraseña son incorrectos.';
        } else if (error.message) {
          friendlyError = error.message;
        }
        setErrorMessage(friendlyError);
        toast.error(friendlyError);
        return;
      }

      toast.success('¡Inicio de sesión exitoso! Redirigiendo...');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      const msg = 'Error de conexión con el servidor de autenticación.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setErrorMessage(null);
    setMicrosoftLoading(true);

    try {
      const { data, error } = await authClient.signIn.social({
        provider: 'microsoft',
        callbackURL: '/',
      });

      if (error) {
        const msg = error.message || 'Error al iniciar sesión con Microsoft OAuth.';
        setErrorMessage(msg);
        toast.error(msg);
        setMicrosoftLoading(false);
      }
    } catch (err: any) {
      console.error('Error de OAuth Microsoft:', err);
      const msg = 'Error al redirigir al proveedor de autenticación Microsoft.';
      setErrorMessage(msg);
      toast.error(msg);
      setMicrosoftLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-stone-950 text-stone-100 relative overflow-hidden p-4">
      {/* Background Decorative Gradients & Glassmorphism Highlights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-800/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-600/30 mb-2 border border-emerald-400/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Low-Voltage Estimator</h1>
          <p className="text-sm text-stone-400">Plataforma Empresarial de Estimación & Cotizaciones</p>
        </div>

        {/* Card Login Form */}
        <Card className="border-stone-800/80 bg-stone-900/90 backdrop-blur-xl shadow-2xl rounded-2xl text-stone-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-white flex items-center justify-center gap-2 font-bold">
              <Lock className="w-5 h-5 text-emerald-500" />
              Acceso al Sistema
            </CardTitle>
            <CardDescription className="text-center text-stone-400 text-xs">
              Ingresa con tu cuenta corporativa o tus credenciales autorizadas
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Mensaje de Error Visual */}
            {errorMessage && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Botón Principal: Microsoft OAuth (Outlook / Entra ID) */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                disabled={microsoftLoading || loading}
                onClick={handleMicrosoftLogin}
                className="w-full bg-stone-950 hover:bg-stone-800 border-stone-700/80 hover:border-blue-500/60 text-stone-100 font-semibold h-12 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 text-xs sm:text-sm"
              >
                {microsoftLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#7FBA00" d="M12 1h10v10H12z"/>
                    <path fill="#00A4EF" d="M1 12h10v10H1z"/>
                    <path fill="#FFB900" d="M12 12h10v10H12z"/>
                  </svg>
                )}
                <span>Continuar con Outlook / Microsoft</span>
              </Button>
            </div>

            {/* Separador Or */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-stone-800 w-full" />
              <span className="bg-stone-900 px-3 text-[11px] font-medium text-stone-500 uppercase tracking-wider shrink-0">
                O acceder con correo
              </span>
            </div>

            {/* Formulario Tradicional Email/Password */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-500" /> Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-emerald-500 h-11 text-sm rounded-xl"
                  disabled={loading || microsoftLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
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
                    className="bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-emerald-500 h-11 pr-10 text-sm rounded-xl"
                    disabled={loading || microsoftLoading}
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
                disabled={loading || microsoftLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 shadow-lg shadow-emerald-600/20 rounded-xl gap-2 transition-all mt-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-3 border-t border-stone-800/60">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Acceso Seguro Empresarial • Better Auth Hybrid Shield</span>
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
