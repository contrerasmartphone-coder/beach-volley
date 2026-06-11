import React, { useState } from 'react';
import { AppUser } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Shield, UserPlus, Trash2, Edit3, Key, Plus, Lock, Check, Eye, EyeOff, X } from 'lucide-react';

interface UserTabProps {
  currentUser: AppUser | null;
  users: AppUser[];
}

export default function UserTab({ currentUser, users }: UserTabProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // New user credentials state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'collaborator' | 'reader'>('reader');
  
  // Visibility toggles
  const [passwordsShown, setPasswordsShown] = useState<{ [key: string]: boolean }>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isAdmin) {
    return (
      <div id="users-tab-forbidden" className="bg-white rounded-3xl p-8 border border-red-200/50 text-center max-w-lg mx-auto shadow-sm mt-6">
        <Lock className="w-12 h-12 text-red-500 mx-auto animate-bounce mb-4" />
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Accesso Riservato agli Amministratori</h3>
        <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
          Spiacenti, solo gli amministratori del Beach Volley Hub possono accedere a questo pannello di gestione dei privilegi utente e delle password. Effettua l'accesso come "admin" per sbloccare questa funzionalità.
        </p>
      </div>
    );
  }

  const togglePasswordVisibility = (id: string) => {
    setPasswordsShown(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPassword = newPassword.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorText('Tutti i campi (utente e password) sono obbligatori.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorText('Il nome utente deve avere almeno 3 caratteri.');
      return;
    }

    // Check if user already exists
    if (users.some(u => u.username === cleanUsername)) {
      setErrorText(`L'utente "${cleanUsername}" è già presente nel database.`);
      return;
    }

    const newUser: AppUser = {
      id: cleanUsername, // unique identifier
      username: cleanUsername,
      password: cleanPassword,
      role: newRole,
      createdAt: new Date().toLocaleDateString('it-IT')
    };

    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      setSuccessText(`Profilo "${cleanUsername}" creato con successo! 🎉`);
      setIsAddFormOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('reader');
      setTimeout(() => setSuccessText(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorText(null);
    setSuccessText(null);

    try {
      await setDoc(doc(db, 'users', editingUser.id), editingUser);
      setSuccessText(`Privilegi per "${editingUser.username}" aggiornati con successo! ⚙️`);
      setEditingUser(null);
      setTimeout(() => setSuccessText(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${editingUser.id}`);
    }
  };

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (userToDelete.username === currentUser.username) {
      alert('Non puoi rimuovere la tua stessa utenza amministratore attiva!');
      return;
    }

    if (!confirm(`Sei sicuro di voler revocare l'accesso e cancellare l'utente "${userToDelete.username}"?`)) return;

    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setSuccessText(`Accesso rimosso per "${userToDelete.username}".`);
      setTimeout(() => setSuccessText(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userToDelete.id}`);
    }
  };

  return (
    <div id="users-dashboard-pane" className="space-y-6">
      
      {/* Feedbacks Alerts banner */}
      {successText && (
        <div id="users-success-bar" className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" />
          {successText}
        </div>
      )}

      {errorText && (
        <div id="users-error-bar" className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-xl shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-600" />
          {errorText}
        </div>
      )}

      {/* Main Container list */}
      <div id="users-workspace-card" className="bg-white rounded-3xl border border-amber-200/60 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-500" />
              Gestione Privilegi Utente ({users.length})
            </h2>
            <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider mt-1">
              Consolle per la regolazione e l'impostazione degli accessi al software
            </p>
          </div>

          <button
            id="btn-open-create-user-form"
            onClick={() => {
              setIsAddFormOpen(true);
              setEditingUser(null);
            }}
            className="bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-2.5 px-4 rounded-xl shadow-md border-b-2 border-sky-700 select-none flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Aggiungi Utente ➕
          </button>
        </div>

        {/* User list table representation */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-slate-50/20">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">Nome Utente / E-mail</th>
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">Livello Privilegio</th>
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">Chiave Password</th>
                <th className="p-3.5 text-center font-black text-slate-500 uppercase tracking-wider">Data Creazione</th>
                <th className="p-3.5 text-right font-black text-slate-500 uppercase tracking-wider">Azioni Gestionali</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u) => {
                const isSelf = u.username === (currentUser?.username);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="font-mono">{u.username}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-sky-100 text-sky-800 font-black uppercase px-2 py-0.5 rounded-full">
                            TU UTENTE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-full border ${
                          u.role === 'admin'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : u.role === 'collaborator'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        🛡️ {u.role === 'admin' ? 'Amministratore (Admin)' : u.role === 'collaborator' ? 'Collaboratore Score' : 'Lettore Spettatore'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type={passwordsShown[u.id] ? 'text' : 'password'}
                          value={u.password || ''}
                          readOnly
                          className="bg-transparent text-[11px] font-mono outline-none border-none py-0.5 max-w-[100px]"
                        />
                        <button
                          id={`btn-toggle-pass-vis-${u.id}`}
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all"
                          title="Mostra / Nascondi password"
                        >
                          {passwordsShown[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                      {u.createdAt}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => {
                            setEditingUser({ ...u });
                            setIsAddFormOpen(false);
                          }}
                          className="bg-slate-50 hover:bg-sky-50 text-sky-700 p-2 rounded-lg transition-all border border-slate-200"
                          title="Modifica privilegi / Password"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u)}
                          disabled={isSelf}
                          className={`p-2 rounded-lg transition-all border ${
                            isSelf
                              ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                              : 'bg-slate-50 hover:bg-red-50 text-red-650 border-slate-200 hover:border-red-200'
                          }`}
                          title="Elimina accesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide / Modal: Add User Form */}
      {isAddFormOpen && (
        <div id="add-user-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="add-user-modal" className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-orange-550" />
                Aggiungi Nuovo Profilo Accesso
              </h3>
              <button
                id="btn-close-add-user-modal"
                onClick={() => setIsAddFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Username / E-mail</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="E.g., mario.rossi@gmail.com"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Password di Accesso</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digita password sicura"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black tracking-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Generate simple random password
                      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
                      let randPass = '';
                      for (let i = 0; i < 8; i++) {
                        randPass += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewPassword(randPass);
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[9px] font-black uppercase bg-sky-100 text-sky-850 hover:bg-sky-200 rounded-lg transition-all"
                  >
                    Genera password 🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Tipo di Privilegio</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all uppercase"
                >
                  <option value="reader">Lettore Spettatore (Solo lettura)</option>
                  <option value="collaborator">Collaboratore Score (Aggiorna punteggi e tabelloni)</option>
                  <option value="admin">Amministratore Completo (Accesso a tutto)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-00 border-sky-700"
                >
                  Conferma Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide / Modal: EDIT User Form */}
      {editingUser && (
        <div id="editing-user-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="editing-user-modal" className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight flex items-center gap-1.5">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                Modifica Privilegi
              </h3>
              <button
                id="btn-close-edit-user-modal"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nome Utente</label>
                <div className="bg-slate-100 border border-slate-200 text-slate-500 px-4 py-3 rounded-xl font-mono text-xs font-black uppercase">
                  {editingUser.username}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Imposta nuova password"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black tracking-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Rapporto di Privilegi</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all uppercase"
                >
                  <option value="reader">Lettore Spettatore (Solo lettura)</option>
                  <option value="collaborator">Collaboratore Score (Aggiorna punteggi e tabelloni)</option>
                  <option value="admin">Amministratore Completo (Accesso a tutto)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700"
                >
                  Salva Privilegi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
