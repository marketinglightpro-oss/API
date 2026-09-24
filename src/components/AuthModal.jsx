import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { LogIn, UserPlus, X, Mail, Lock, User, Shield, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('technician');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      // Local fallback mock authentication if Supabase not configured
      const mockUser = {
        id: `usr_${Date.now()}`,
        email,
        user_metadata: { full_name: fullName || email.split('@')[0], role },
      };
      onAuthSuccess(mockUser, role);
      setLoading(false);
      onClose();
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
              role: role,
            }
          }
        });

        if (signUpErr) throw signUpErr;

        if (data.user) {
          // Upsert into profiles table explicitly as fallback
          await supabase.from('profiles').upsert([{
            id: data.user.id,
            email: email,
            full_name: fullName || email.split('@')[0],
            role: role,
          }]);

          setMessage('¡Cuenta creada exitosamente! Revisa tu correo o inicia sesión.');
          onAuthSuccess(data.user, role);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data.user) {
          // Fetch profile role from Supabase profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userRole = profile?.role || data.user.user_metadata?.role || 'technician';
          onAuthSuccess(data.user, userRole);
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Error durante la autenticación. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="liquid-card bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/80 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <img src="/logo.png" alt="LIGHT PRO" className="h-8 object-contain mb-2" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {isSignUp ? 'Crear Nueva Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSignUp ? 'Regístrate para sincronizar con Supabase' : 'Ingresa tus credenciales de usuario'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-full text-xs font-semibold mb-5">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-full transition-all ${
              !isSignUp ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-full transition-all ${
              isSignUp ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {isSignUp && (
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Nombre Completo *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Correo Electrónico *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@lightpro.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Contraseña *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Rol de Usuario en Sistema *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    role === 'admin' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('technician')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    role === 'technician' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Técnico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    role === 'client' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Cliente</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full liquid-btn-primary py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>Cargando...</span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta Supabase</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
