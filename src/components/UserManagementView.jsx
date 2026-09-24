import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Users, UserPlus, Shield, Wrench, User, Trash2, CheckCircle2, Plus, Copy, Eye, EyeOff, RefreshCw, Key, Search, Phone, Mail, Sparkles, AlertCircle } from 'lucide-react';

export default function UserManagementView({ currentUser, teamMembers = [], onUpdateTeamMembers }) {
  const [users, setUsers] = useState([
    { id: 'usr-1', full_name: 'Stivens', email: 'light.pro01@hotmail.com', role: 'super_admin', phone: '+57 300 000 0000', created_at: new Date().toISOString() },
    { id: 'usr-2', full_name: 'Carlos Mendoza', email: 'carlos.mendoza@lightpro.com', role: 'technician', phone: '+57 311 222 3333', created_at: new Date().toISOString() },
    { id: 'usr-3', full_name: 'Andrés Silva', email: 'andres.silva@lightpro.com', role: 'admin', phone: '+57 320 444 5555', created_at: new Date().toISOString() },
    { id: 'usr-4', full_name: 'Producciones Eventos Global S.A.', email: 'contacto@eventosglobal.co', role: 'client', phone: '+57 315 888 9999', created_at: new Date().toISOString() },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('technician');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Credentials Result Modal State
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Fetch Profiles from Supabase on Mount
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data, error: err } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!err && data && data.length > 0) {
          setUsers(data);
          if (onUpdateTeamMembers) onUpdateTeamMembers(data);
        }
      } catch (e) {
        console.warn('Error al cargar perfiles de Supabase:', e);
      }
    };
    fetchProfiles();
  }, []);

  // Password Generator Helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let generated = 'Lp!';
    for (let i = 0; i < 7; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  // UUID Helper for Supabase Compatibility
  const getValidUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Create User Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);

    let createdAuthId = null;
    let syncError = null;

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Attempt Supabase Auth Sign Up
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              role: role,
              phone: phone.trim(),
            }
          }
        });

        if (signUpErr) {
          console.error('Error de Supabase Auth signUp:', signUpErr);
          syncError = `Auth Error: ${signUpErr.message}`;
        } else if (authData?.user) {
          createdAuthId = authData.user.id;
        }

        // Fallback valid UUID if authData user ID is missing
        if (!createdAuthId) {
          createdAuthId = getValidUUID();
        }

        // 2. Insert/Upsert into public.profiles table
        const { error: profErr } = await supabase.from('profiles').upsert([{
          id: createdAuthId,
          email: email.trim(),
          full_name: fullName.trim(),
          role: role,
          phone: phone.trim() || null,
          created_at: new Date().toISOString(),
        }]);

        if (profErr) {
          console.error('Error de Supabase Profiles insert:', profErr);
          if (!syncError) {
            syncError = `Error en perfiles: ${profErr.message}`;
          }
        }
      } catch (err) {
        console.error('Error general creando usuario en Supabase:', err);
        syncError = `Error general: ${err.message || err}`;
      }
    } else {
      createdAuthId = getValidUUID();
    }

    // If there was an error saving to Supabase Auth or Profiles, display it to the user
    if (syncError) {
      setErrorMsg(`No se pudo crear en Supabase: ${syncError}`);
      setLoading(false);
      return; // Keep modal open so admin sees the exact error message!
    }

    const newUserObj = {
      id: createdAuthId || getValidUUID(),
      full_name: fullName.trim(),
      email: email.trim(),
      role: role,
      phone: phone.trim() || '',
      created_at: new Date().toISOString(),
    };

    const updatedUsersList = [newUserObj, ...users.filter(u => u.email !== email.trim())];
    setUsers(updatedUsersList);
    if (onUpdateTeamMembers) onUpdateTeamMembers(updatedUsersList);

    // Save Credentials to Display Result Card
    setCreatedCredentials({
      full_name: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
      role: role,
      phone: phone.trim(),
    });

    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setLoading(false);
    setShowCreateModal(false);
  };

  const handleUpdateRole = async (userId, newRole) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updated);
    if (onUpdateTeamMembers) onUpdateTeamMembers(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      } catch (e) {
        console.error('Error actualizando rol en Supabase:', e);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario del equipo?')) return;
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    if (onUpdateTeamMembers) onUpdateTeamMembers(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (e) {
        console.error('Error eliminando usuario de Supabase:', e);
      }
    }
  };

  const handleCopyCredentialsText = () => {
    if (!createdCredentials) return;
    const roleLabel = getRoleLabel(createdCredentials.role);
    const textToCopy = `LIGHTPRO - Acceso a la Plataforma\n` +
      `-------------------------------------\n` +
      `Nombre: ${createdCredentials.full_name}\n` +
      `Rol Asignado: ${roleLabel}\n` +
      `Correo Electrónico: ${createdCredentials.email}\n` +
      `Contraseña: ${createdCredentials.password}\n` +
      `-------------------------------------`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      default: return 'Cliente';
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'super_admin':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit"><Shield className="w-3 h-3 text-amber-600" /> Super Admin</span>;
      case 'admin':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit"><Shield className="w-3 h-3 text-purple-600" /> Administrador</span>;
      case 'technician':
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit"><Wrench className="w-3 h-3 text-blue-600" /> Técnico</span>;
      default:
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1 w-fit"><User className="w-3 h-3 text-gray-600" /> Cliente</span>;
    }
  };

  // Filter users by search and role
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    
    if (selectedRoleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === selectedRoleFilter;
  });

  const totalTechnicians = users.filter(u => u.role === 'technician').length;
  const totalAdmins = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const totalClients = users.filter(u => u.role === 'client').length;

  return (
    <div className="w-full px-3 sm:px-6 md:px-8 mb-12 animate-fadeIn">
      
      {/* Top Section Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="liquid-card p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Integrantes</p>
            <p className="text-2xl font-extrabold text-gray-900">{users.length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="liquid-card p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Técnicos</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalTechnicians}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="liquid-card p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Administradores</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalAdmins}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-200">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="liquid-card p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Clientes</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalClients}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="liquid-card rounded-3xl p-6 sm:p-8 bg-white border border-gray-200 shadow-md w-full">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  Gestión de Equipos & Personal de LIGHTPRO
                </h2>
                <span className="text-[10px] font-bold uppercase bg-amber-400 text-black px-2.5 py-0.5 rounded-full">
                  Exclusivo Super Admin / Admin
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Registra técnicos, administradores y clientes. Genera sus credenciales (correo + contraseña) y sincronízalos con Supabase.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleGeneratePassword();
              setShowCreateModal(true);
            }}
            className="liquid-btn-primary px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md hover:scale-105 transition-all flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Integrante</span>
          </button>
        </div>

        {/* Search & Role Filter Tabs Bar */}
        <div className="pt-5 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              className="w-full bg-white border border-gray-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black shadow-xs"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-semibold border border-gray-200 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedRoleFilter('all')}
              className={`px-3 py-1 rounded-full transition-all text-[11px] ${
                selectedRoleFilter === 'all' ? 'bg-black text-white shadow-xs font-bold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setSelectedRoleFilter('technician')}
              className={`px-3 py-1 rounded-full transition-all text-[11px] ${
                selectedRoleFilter === 'technician' ? 'bg-black text-white shadow-xs font-bold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Técnicos ({totalTechnicians})
            </button>
            <button
              onClick={() => setSelectedRoleFilter('admin')}
              className={`px-3 py-1 rounded-full transition-all text-[11px] ${
                selectedRoleFilter === 'admin' ? 'bg-black text-white shadow-xs font-bold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Admins ({totalAdmins})
            </button>
            <button
              onClick={() => setSelectedRoleFilter('client')}
              className={`px-3 py-1 rounded-full transition-all text-[11px] ${
                selectedRoleFilter === 'client' ? 'bg-black text-white shadow-xs font-bold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Clientes ({totalClients})
            </button>
          </div>

        </div>

        {/* Users Table */}
        <div className="mt-2 overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Nombre Completo</th>
                <th className="py-3 px-3">Correo / Usuario</th>
                <th className="py-3 px-3">Teléfono</th>
                <th className="py-3 px-3">Rol & Permisos</th>
                <th className="py-3 px-3">Cambiar Rol</th>
                <th className="py-3 px-3">Registro</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-gray-400 italic">
                    No se encontraron usuarios o integrantes registrados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                          {u.full_name[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 font-mono text-[11px]">
                      {u.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{u.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">Sin teléfono</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-white border border-gray-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black shadow-xs cursor-pointer"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Administrador</option>
                        <option value="technician">Técnico</option>
                        <option value="client">Cliente</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-3 text-gray-400 font-mono text-[11px]">
                      {new Date(u.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {u.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-gray-400 hover:text-red-700 transition-colors border border-gray-200"
                          title="Eliminar Integrante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal 1: Formulario Registrar Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="liquid-card bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-gray-200 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Registrar Integrante de Equipo
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-black hover:text-white flex items-center justify-center text-gray-500 border border-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 text-red-800 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nombre Completo del Usuario *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Andrés Gómez"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Correo Electrónico (Login) *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="andres@lightpro.com"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
                  />
                </div>
              </div>

              {/* Password Generator Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700">Contraseña de Acceso *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Generar Contraseña Segura</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-gray-300 rounded-xl pl-3.5 pr-10 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono font-bold text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-black"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Rol & Permisos en el Sistema *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-bold"
                >
                  <option value="technician">Técnico (Diagnóstico, Kanban, comentarios y QR)</option>
                  <option value="admin">Administrador (Asignar roles y borrado)</option>
                  <option value="client">Cliente (Registrar equipos y seguimiento)</option>
                  <option value="super_admin">Super Admin (Control Total del Sistema)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="liquid-btn-secondary px-4 py-2 rounded-full font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="liquid-btn-primary px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{loading ? 'Sincronizando...' : 'Registrar y Generar Credenciales'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal 2: Tarjeta de Credenciales Creadas para Copiar y Enviar */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
          <div className="liquid-card bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-emerald-200 shadow-2xl relative space-y-4">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                ¡Usuario Creado & Listo en Supabase!
              </h3>
              <p className="text-xs text-gray-500">
                Las credenciales de acceso se han generado correctamente. Copia los datos a continuación para enviárselos al usuario.
              </p>
            </div>

            {/* Credential Details Box */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2.5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-sans font-semibold">Nombre:</span>
                <span className="font-extrabold text-gray-900 font-sans">{createdCredentials.full_name}</span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-sans font-semibold">Rol Asignado:</span>
                <div>{getRoleBadge(createdCredentials.role)}</div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-sans font-semibold">Correo de Acceso:</span>
                <span className="font-bold text-gray-900">{createdCredentials.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-sans font-semibold">Contraseña:</span>
                <span className="font-extrabold text-blue-700 text-sm bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            {/* Copy Button */}
            <div className="space-y-2">
              <button
                onClick={handleCopyCredentialsText}
                className={`w-full py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'liquid-btn-primary'
                }`}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Credenciales Copiadas al Portapapeles!' : 'Copiar Credenciales al Portapapeles'}</span>
              </button>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
