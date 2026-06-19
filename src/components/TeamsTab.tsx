import React, { useState } from 'react';
import { Team, AppUser } from '../types';
import { DEMO_TEAMS, getInitialTeamStats, sortTeamsByEntryList } from '../utils';
import { Plus, Users, Search, Trash2, Award, Sparkles, Check, Phone, Mail, Edit2, Lock, Eye, MessageSquare, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface TeamsTabProps {
  teams: Team[];
  onAddTeam: (team: Team) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (id: string) => void;
  onLoadDemoTeams: (count: number) => void;
  onClearAllTeams: () => void;
  isLocked?: boolean;
  admittedTeamsCount?: number | null;
  isTournamentStarted?: boolean;
  onSubstituteTeam?: (withdrawnId: string, promotedId: string) => void;
  currentUser?: AppUser | null;
  users?: AppUser[];
}

const getWhatsAppUrl = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '39' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
};

export default function TeamsTab({
  teams,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onLoadDemoTeams,
  onClearAllTeams,
  isLocked = false,
  admittedTeamsCount = null,
  isTournamentStarted = false,
  onSubstituteTeam,
  currentUser = null,
  users = [],
}: TeamsTabProps) {
  const canWrite = currentUser && (currentUser.role === 'admin' || currentUser.role === 'collaborator');
  const isAdmin = currentUser && currentUser.role === 'admin';

  const [name, setName] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Bronze' | 'Silver' | 'Gold'>('Silver');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email2, setEmail2] = useState('');
  const [customCount, setCustomCount] = useState<number | ''>(24);
  
  const [copiedIdField, setCopiedIdField] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const handleCopy = (text: string, idField: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdField(idField);
    setTimeout(() => {
      setCopiedIdField(null);
    }, 1500);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // SQUADRE EDITING STATE
  const [editName, setEditName] = useState('');
  const [editPlayer1, setEditPlayer1] = useState('');
  const [editPlayer2, setEditPlayer2] = useState('');
  const [editLevel, setEditLevel] = useState<'Beginner' | 'Bronze' | 'Silver' | 'Gold'>('Silver');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editEmail2, setEditEmail2] = useState('');

  // SQUADRE DETAILS & EDITING UNIFIED STATE
  const [selectedDetailsTeam, setSelectedDetailsTeam] = useState<Team | null>(null);

  const openDetailsAndEdit = (team: Team) => {
    setSelectedDetailsTeam(team);
    setEditName(team.name);
    setEditPlayer1(team.player1);
    setEditPlayer2(team.player2);
    setEditLevel(team.level);
    setEditPhone(team.phone === 'Non specificato' ? '' : team.phone);
    setEditEmail(team.email === 'Non specificata' ? '' : team.email);
    setEditPhone2(team.phone2 === 'Non specificato' || !team.phone2 ? '' : team.phone2);
    setEditEmail2(team.email2 === 'Non specificata' || !team.email2 ? '' : team.email2);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!selectedDetailsTeam || !editName || !editPlayer1 || !editPlayer2) return;

    const updatedTeam: Team = {
      ...selectedDetailsTeam,
      name: editName.trim(),
      player1: editPlayer1.trim(),
      player2: editPlayer2.trim(),
      level: editLevel,
      phone: editPhone.trim() || 'Non specificato',
      email: editEmail.trim() || 'Non specificata',
      phone2: editPhone2.trim() || 'Non specificato',
      email2: editEmail2.trim() || 'Non specificata',
    };

    onEditTeam(updatedTeam);
    setSelectedDetailsTeam(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!name || !player1 || !player2) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const registeredAtString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const newTeam: Team = getInitialTeamStats({
      id: `team-${Date.now()}`,
      name: name.trim(),
      player1: player1.trim(),
      player2: player2.trim(),
      level,
      phone: phone.trim() || 'Non specificato',
      email: email.trim() || 'Non specificata',
      phone2: phone2.trim() || 'Non specificato',
      email2: email2.trim() || 'Non specificata',
      registeredAt: registeredAtString,
    });

    onAddTeam(newTeam);
    
    // Reset Form
    setName('');
    setPlayer1('');
    setPlayer2('');
    setLevel('Silver');
    setPhone('');
    setEmail('');
    setPhone2('');
    setEmail2('');

    setSuccessMsg('Squadra registrata con successo!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const [substituteConfirmTeam, setSubstituteConfirmTeam] = useState<Team | null>(null);

  // Separate active teams and withdrawn/substituted teams to avoid mixing them in normal lists
  const activeTeams = teams.filter((t) => !t.isWithdrawn && !t.name.endsWith(' [RITIRATA]'));
  const withdrawnTeams = teams.filter((t) => !!t.isWithdrawn || t.name.endsWith(' [RITIRATA]'));

  const sortedGlobalTeams = sortTeamsByEntryList(activeTeams);
  
  // Admitted and Reserve lists division when tournament behaves with exclusions (use activeTeams only)
  const hasExclusions = !!(isLocked && admittedTeamsCount !== null && admittedTeamsCount !== undefined && activeTeams.length > admittedTeamsCount);

  const chronologicallySorted = [...activeTeams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));

  const admittedTeams = hasExclusions && admittedTeamsCount !== null && admittedTeamsCount !== undefined
    ? chronologicallySorted.slice(0, admittedTeamsCount)
    : chronologicallySorted;

  const reserveTeams = hasExclusions && admittedTeamsCount !== null && admittedTeamsCount !== undefined
    ? chronologicallySorted.slice(admittedTeamsCount)
    : [];

  const sortedAdmitted = sortTeamsByEntryList(admittedTeams);
  const sortedReserves = [...reserveTeams]; // Strictly sorted chronologically

  const filterByQuery = (list: Team[]) => {
    return list.filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.player1.toLowerCase().includes(q) ||
        t.player2.toLowerCase().includes(q)
      );
    });
  };

  const filteredAdmitted = filterByQuery(sortedAdmitted);
  const filteredReserves = filterByQuery(sortedReserves);

  const filteredTeams = sortTeamsByEntryList(
    activeTeams.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.player1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.player2.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const beginnerCount = teams.filter((t) => t.level === 'Beginner').length;
  const bronzeCount = teams.filter((t) => t.level === 'Bronze').length;
  const silverCount = teams.filter((t) => t.level === 'Silver').length;
  const goldCount = teams.filter((t) => t.level === 'Gold').length;

  const renderTeamCard = (team: Team, index: number, isReserve: boolean) => {
    const isWithdrawn = team.isWithdrawn || team.name.includes('[RITIRATA]');
    const globalRank = sortedGlobalTeams.findIndex(t => t.id === team.id) + 1;
    const isReservePosition = sortedReserves.findIndex(t => t.id === team.id) + 1;
    
    const getLevelColor = (level: Team['level']) => {
      switch (level) {
        case 'Gold': return 'bg-amber-500 text-white border-amber-600';
        case 'Silver': return 'bg-slate-400 text-white border-slate-500';
        case 'Bronze': return 'bg-amber-700 text-white border-amber-800';
        case 'Beginner': return 'bg-emerald-500 text-white border-emerald-600';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        key={team.id}
        id={`team-card-${team.id}`}
        className={`border-2 rounded-2xl p-4 relative group hover:shadow-lg transition-all ${
          isWithdrawn
            ? 'border-rose-200 bg-rose-50/20 opacity-80 border-dashed'
            : isReserve 
              ? 'border-dashed border-orange-200 bg-orange-50/15 hover:border-orange-400' 
              : 'border-slate-200 bg-slate-50 hover:border-sky-400 bg-sky-50/5'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {isWithdrawn ? (
                <span className="bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-b-2 border-rose-700 animate-pulse">
                  ❌ Ritirata
                </span>
              ) : isReserve ? (
                <span className="bg-orange-400 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-b-2 border-orange-600">
                  Riserva #{isReservePosition}
                </span>
              ) : (
                <span className="bg-sky-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-b-2 border-sky-700">
                  Rank #{globalRank}
                </span>
              )}
              {canWrite && (
                <span id={`team-level-badge-${team.id}`} className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-b-2 ${getLevelColor(team.level)}`}>
                  {team.level}
                </span>
              )}
            </div>
            <h4 id={`team-name-title-${team.id}`} className="font-extrabold text-slate-800 text-sm mt-2 uppercase">{team.name}</h4>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canWrite && (
              <button
                id={`edit-team-btn-${team.id}`}
                onClick={() => openDetailsAndEdit(team)}
                className="text-slate-400 hover:text-sky-600 p-1.5 rounded-lg hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-200 cursor-pointer"
                title={canWrite && (!isLocked || !isTournamentStarted) ? "Dettagli / Modifica squadra" : "Dettagli squadra"}
              >
                <Eye className="w-4 h-4 text-sky-500" />
              </button>
            )}
            {canWrite && (!isLocked || !isTournamentStarted) && !isWithdrawn ? (
              <button
                id={`delete-team-btn-${team.id}`}
                onClick={() => {
                  setTeamToDelete(team);
                }}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                title={isLocked ? "Ritira questa squadra dal torneo" : "Elimina squadra"}
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
              </button>
            ) : (isWithdrawn || isReserve) ? (
              <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-xl border select-none cursor-not-allowed ${
                isWithdrawn
                  ? 'bg-rose-50 border-rose-100 text-rose-500'
                  : 'bg-orange-50 border-orange-250 text-orange-600'
              }`} title={isWithdrawn ? "Squadre ritirata dal torneo" : "Riserva nel torneo attivo"}>
                <Lock className="w-3 h-3 text-current" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {isWithdrawn ? 'Ritirata' : 'Riserva'}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5 mt-3 bg-white p-2.5 rounded-xl border border-slate-200">
          <div className="flex gap-2 text-xs text-slate-700 font-bold">
            <span className="font-black text-orange-500 w-4 font-mono text-center">1</span>
            <span id={`team-player1-${team.id}`}>{team.player1}</span>
          </div>
          <div className="flex gap-2 text-xs text-slate-700 font-bold">
            <span className="font-black text-orange-500 w-4 font-mono text-center">2</span>
            <span id={`team-player2-${team.id}`}>{team.player2}</span>
          </div>
        </div>

        {/* Visualise links of substitution/retirement */}
        {isWithdrawn && team.replacedByTeamName && (
          <div className="mt-2.5 text-[10px] font-bold text-rose-700 bg-rose-50/70 border border-rose-150 rounded-xl p-2 px-3 flex items-center gap-1.5 leading-tight">
            <RefreshCw className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-spin duration-3000" />
            <span>Sostituita da: <strong className="uppercase">{team.replacedByTeamName}</strong></span>
          </div>
        )}
        {!isWithdrawn && team.subenteredForTeamName && (
          <div className="mt-2.5 text-[10px] font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-150 rounded-xl p-2 px-3 flex items-center gap-1.5 leading-tight">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Subentrata al posto di: <strong className="uppercase">{team.subenteredForTeamName}</strong></span>
          </div>
        )}

        {isLocked && !isReserve && !isTournamentStarted && !isWithdrawn && canWrite && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              id={`substitute-withdraw-btn-${team.id}`}
              onClick={() => setSubstituteConfirmTeam(team)}
              className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 rounded-xl border border-orange-300 shadow-sm hover:shadow-md transition-all active:translate-y-0.5 border-b-2 border-orange-600 bg-orange-500 cursor-pointer"
              title={sortedReserves.length > 0 ? "Ritira la squadra e inserisci in automatico la prima riserva" : "Ritira questa squadra dal torneo"}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ritiro 🔄
            </button>
          </div>
        )}

        {canWrite && (
          <div className="border-t border-slate-200 flex flex-col gap-0.5 mt-3.5 pt-2 text-[10px] font-bold text-slate-400">
            <div className="flex justify-between items-center w-full">
              <span>
                Iscritta:{' '}
                {(() => {
                  if (team.registeredAt.includes(' ')) {
                    const [d, t] = team.registeredAt.split(' ');
                    const parts = d.split('-');
                    if (parts.length === 3) {
                      const [y, m, dayVal] = parts;
                      return `${dayVal}/${m}/${y} alle ${t.substring(0, 5)}`;
                    }
                  }
                  const parts = team.registeredAt.split('-');
                  if (parts.length === 3) {
                    const [y, m, dayVal] = parts;
                    return `${dayVal}/${m}/${y}`;
                  }
                  return team.registeredAt;
                })()}
              </span>

            </div>
            {!isWithdrawn && team.subenteredForTeamName && (
              <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wide flex items-center gap-1 mt-1">
                • Data d'iscrizione ereditata dalla squadra sostituita
              </span>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div id="teams-tab-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Registration Column */}
      {canWrite && (
        <div id="registration-panel" className={`lg:col-span-1 space-y-6 ${isLocked ? 'order-2 lg:order-none' : 'order-1 lg:order-none'}`}>
        <div className="bg-white rounded-3xl shadow-xl border-4 border-orange-300 p-6 relative overflow-hidden">
          {!canWrite ? (
            <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-25 animate-in fade-in duration-200">
              <div className="p-4 bg-sky-50 rounded-full border-4 border-sky-300 text-sky-500 mb-4">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base uppercase italic">Sola Lettura 👁️</h4>
              <p className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">Accesso Limitato</p>
              <p className="text-xs font-medium text-slate-600 mt-3 leading-relaxed max-w-xs">
                Sei connesso come <strong>Spettatore / Lettore</strong>. Non sei autorizzato ad aggiungere, modificare o cancellare le formazioni.
              </p>
              <p className="text-[10px] font-bold text-sky-600 mt-4 leading-relaxed bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                🔒 Effettua l'accesso in alto come amministratore o collaboratore per sbloccare.
              </p>
            </div>
          ) : isLocked ? (
            <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-25 animate-in fade-in duration-200">
              <div className="p-4 bg-amber-50 rounded-full border-4 border-amber-300 text-amber-500 mb-4 animate-bounce">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base uppercase italic">Iscrizioni Chiuse</h4>
              <p className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">Torneo in Corso</p>
              <p className="text-xs font-medium text-slate-600 mt-3 leading-relaxed max-w-xs">
                La modifica delle squadre e le nuove iscrizioni sono bloccate perché il torneo è già stato generato e i tabelloni sono operativi.
              </p>
              <p className="text-[10px] font-bold text-sky-600 mt-4 leading-relaxed bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                💡 Per fare modifiche, cancella o resetta il torneo dalla scheda "Gare"
              </p>
            </div>
          ) : null}
          <div className="flex items-center gap-3 mb-6 font-sans">
            <div className="p-3 bg-orange-100 border-2 border-orange-300 rounded-full text-orange-600">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-black text-orange-700 tracking-tight text-xl uppercase italic">Registra Squadra</h3>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Nuova coppia di gioco</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="team-name-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nome Squadra *
              </label>
              <input
                id="team-name-input"
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 text-sm font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                placeholder="es. I Re della Spiaggia"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="player-1-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Giocatore 1 *
                </label>
                <input
                  id="player-1-input"
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Nome e cognome"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="player-2-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Giocatore 2 *
                </label>
                <input
                  id="player-2-input"
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Nome e cognome"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="level-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Livello di Gioco
              </label>
              <div id="level-select" className="grid grid-cols-2 md:grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                {(['Beginner', 'Bronze', 'Silver', 'Gold'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    id={`level-opt-${lvl}`}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-1.5 md:py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      level === lvl
                        ? 'bg-orange-400 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Contatti per Notifiche
              </h4>
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Contatti Giocatore 1 ({player1 || 'Giocatore 1'})</span>
                <div>
                  <label htmlFor="phone-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="phone-input"
                      type="tel"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                      placeholder="es. +39 333 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="email-input"
                      type="email"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                      placeholder="es. giocatore1@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Contatti Giocatore 2 ({player2 || 'Giocatore 2'})</span>
                <div>
                  <label htmlFor="phone2-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="phone2-input"
                      type="tel"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-400 text-slate-800"
                      placeholder="es. +39 339 9876543"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email2-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="email2-input"
                      type="email"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-semibold bg-amber-50/20 focus:outline-none focus:border-orange-400 transition-all placeholder:text-slate-404 text-slate-800"
                      placeholder="es. giocatore2@email.com"
                      value={email2}
                      onChange={(e) => setEmail2(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {successMsg && (
              <div id="registration-success-msg" className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border-2 border-emerald-200">
                <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                {successMsg}
              </div>
            )}

            <button
              id="submit-register-team-btn"
              type="submit"
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-black tracking-wider uppercase italic py-3 px-4 rounded-full border-b-4 border-orange-600 transition-all text-sm flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Iscrivi Squadra
            </button>
          </form>
        </div>

        {/* Demo Generators panel */}
        <div className="bg-white rounded-3xl p-6 border-4 border-emerald-400 shadow-xl space-y-4 relative overflow-hidden">
          {!canWrite && (
            <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-25 animate-in fade-in duration-200">
              <Lock className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Accesso Limitato</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed">Solo caricamento in lettura</p>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-emerald-700">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-bounce" />
            <h4 className="font-black uppercase italic text-sm">Generatore rapido</h4>
          </div>
          
          {isLocked && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex gap-2.5 items-start">
              <Lock className="w-4 h-4 text-amber-655 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-amber-850 uppercase tracking-wide">Torneo configurato</p>
                <p className="text-[9px] font-bold text-amber-700 leading-normal">
                  Il caricamento della demo azzererà tutte le gare correnti e i record in tempo reale del torneo.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-600">
            Non hai squadre a disposizione? Genera all'istante coppie e atleti pre-configurati per far partire subito il torneo.
          </p>
          
          <div className="grid grid-cols-2 gap-2 pb-1">
            <button
              id="load-demo-8-btn"
              type="button"
              onClick={() => isLocked ? setShowResetConfirm(8) : onLoadDemoTeams(8)}
              className="bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-xs text-emerald-800 font-black tracking-wider uppercase italic py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              8 Squadre
            </button>
            <button
              id="load-demo-16-btn"
              type="button"
              onClick={() => isLocked ? setShowResetConfirm(16) : onLoadDemoTeams(16)}
              className="bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-xs text-emerald-800 font-black tracking-wider uppercase italic py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              16 Squadre
            </button>
          </div>

          <div id="custom-demo-generator-controls" className="pt-2 border-t border-slate-100 space-y-2">
            <label htmlFor="custom-teams-count-input" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Oppure imposta un numero personalizzato:
            </label>
            <div className="flex gap-2">
              <input
                id="custom-teams-count-input"
                type="number"
                min="2"
                max="128"
                value={customCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setCustomCount('');
                  } else {
                    const parsed = parseInt(val);
                    setCustomCount(isNaN(parsed) ? 24 : parsed);
                  }
                }}
                placeholder="es. 12"
                className="w-24 px-3 py-2 border-2 border-slate-250 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-emerald-400 bg-slate-50/50 text-slate-800"
              />
              <button
                id="load-demo-custom-btn"
                type="button"
                onClick={() => {
                  const finalVal = customCount === '' || customCount < 2 ? 12 : customCount;
                  if (isLocked) {
                    setShowResetConfirm(finalVal);
                  } else {
                    onLoadDemoTeams(finalVal);
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black tracking-wider uppercase italic py-2 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Genera {customCount || 'Custom'} 🏐
              </button>
            </div>
          </div>
          {teams.length > 0 && (
            <button
              id="clear-all-teams-btn"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full bg-rose-50 border-2 border-dashed border-rose-300 text-xs text-rose-700 font-black tracking-wider uppercase py-2 px-3 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
            >
              Rimuovi tutte le squadre ({teams.length})
            </button>
          )}
        </div>
      </div>
      )}

      {/* Roster / Directory Column */}
      <div id="roster-panel" className={`${canWrite ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 ${isLocked ? 'order-1 lg:order-none' : 'order-2 lg:order-none'}`}>
        {/* Statistics headers */}
        <div className="flex flex-col items-center justify-center w-full py-4 text-center gap-4">
          {/* Centered Total Teams Badge/Button */}
          {!isLocked ? (
            <div className="relative group overflow-hidden bg-gradient-to-br from-orange-400 via-amber-500 to-orange-500 text-white px-6 py-3.5 rounded-full border-4 border-amber-300 shadow-[0_10px_35px_-8px_rgba(249,115,22,0.3)] flex items-center gap-4 hover:scale-104 active:scale-98 transition-all duration-300 select-none max-w-xs w-full justify-center">
              {/* Highlight background glow */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full" />
              
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/40 shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] animate-pulse">
                <Users className="w-5.5 h-5.5 md:w-6 md:h-6 stroke-[2.5]" />
              </div>
              <div className="flex flex-col items-start text-left">
                <div id="stat-total-teams" className="text-2xl md:text-3xl font-black font-mono leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] flex items-baseline gap-1.5 align-middle">
                  {teams.length}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">Squadre</span>
                </div>
                <div className="text-[9px] md:text-[10px] uppercase font-black text-orange-55 tracking-wider mt-0.5 italic flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Iscrizioni Aperte</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group overflow-hidden bg-gradient-to-br from-slate-600 via-zinc-800 to-slate-700 text-white px-6 py-3.5 rounded-full border-4 border-slate-500 shadow-[0_10px_30px_-8px_rgba(71,85,105,0.25)] flex items-center gap-4 hover:scale-104 active:scale-98 transition-all duration-300 select-none max-w-xs w-full justify-center">
              {/* Highlight background glow */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full" />
              
              <div className="p-2.5 bg-slate-800/60 backdrop-blur-md rounded-full text-slate-350 border border-slate-605 shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)]">
                <Lock className="w-5.5 h-5.5 md:w-6 md:h-6 stroke-[2.5]" />
              </div>
              <div className="flex flex-col items-start text-left">
                <div id="stat-total-teams" className="text-2xl md:text-3xl font-black font-mono leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] text-slate-200 flex items-baseline gap-1.5 align-middle">
                  {teams.length}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Squadre</span>
                </div>
                <div className="text-[9px] md:text-[10px] uppercase font-black text-rose-350 tracking-wider mt-0.5 italic flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>Iscrizioni Chiuse</span>
                </div>
              </div>
            </div>
          )}

          {/* Level Statistics Grid for CanWrite */}
          {canWrite && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mt-1">
              <div className="bg-white p-3 rounded-2xl border-2 border-amber-500 shadow-sm flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 border border-amber-200 shrink-0">
                  <Award className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left">
                  <div id="stat-gold-teams" className="text-base font-black text-slate-800 font-mono leading-none">{goldCount}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Gold</div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600 border border-slate-200 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div id="stat-silver-teams" className="text-base font-black text-slate-800 font-mono leading-none">{silverCount}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Silver</div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-amber-700 shadow-sm flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-800 border border-amber-500 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div id="stat-bronze-teams" className="text-base font-black text-slate-800 font-mono leading-none">{bronzeCount}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Bronze</div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-emerald-400 shadow-sm flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 border border-emerald-200 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div id="stat-beginner-teams" className="text-base font-black text-slate-800 font-mono leading-none">{beginnerCount}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Beginner</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Directory header and search */}
        <div className="bg-white rounded-3xl shadow-xl border-4 border-sky-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-black text-sky-850 text-xl uppercase italic pb-1">Lista d'Ingresso</h3>
              {canWrite && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graduatoria basata sul livello di gioco (Gold, Silver, Bronze, Beginner) e ordine d'iscrizione</p>
              )}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="search-teams-input"
                type="text"
                placeholder="Cerca squadra o giocatore..."
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-amber-50/20 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Informative Rule Banner */}
          {canWrite && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50/50 border-l-4 border-sky-500 p-4 rounded-r-2xl mb-6 text-slate-700 text-xs font-semibold leading-relaxed flex gap-3">
              <div className="p-1.5 bg-sky-100 rounded-xl text-sky-600 shrink-0 self-start">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-extrabold text-sky-950 text-[11px] uppercase tracking-wider mb-1 font-sans">
                  Regolamento Lista d'Ingresso & Riserve
                </h5>
                <p className="mb-1.5">
                  La <strong>Lista d'Ingresso</strong> viene ordinata per <strong>livello di gioco</strong> (Gold, Silver, Bronze, Beginner) e, a parità di livello, per <strong>ordine cronologico di iscrizione</strong>.
                </p>
                <p>
                  Tuttavia, in caso di superamento della capienza massima stabilita per la formula del torneo, le eventuali esclusioni (riserve) sono decretate <strong>esclusivamente in ordine cronologico di iscrizione</strong> (le squadre registrate per ultime saranno escluse per prime, a prescindere dal livello). Le riserve subentreranno in caso di ritiri seguendo rigorosamente l'ordine cronologico di iscrizione.
                </p>
              </div>
            </div>
          )}

          {hasExclusions ? (
            filteredAdmitted.length === 0 && filteredReserves.length === 0 ? (
              <div id="no-teams-placeholder" className="text-center py-12 border-4 border-dashed border-slate-200 rounded-3xl bg-amber-50/50">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Nessuna squadra trovata</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">Nessun match corrispondente ai criteri di ricerca.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* LISTA INGRESSO (AMMESSI) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-slate-150 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                        Lista d'Ingresso / Ammesse ({admittedTeamsCount})
                      </h4>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                      Ammesse ✔️
                    </span>
                  </div>
                  
                  {filteredAdmitted.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400 italic py-4">Nessuna squadra ammessa corrisponde ai criteri di ricerca.</p>
                  ) : (
                    <div id="teams-grid-admitted" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAdmitted.map((team, index) => renderTeamCard(team, index, false))}
                    </div>
                  )}
                </div>

                {/* LISTA RISERVE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-slate-150 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-400"></span>
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                        Lista Riserve / Escluse ({activeTeams.length - (admittedTeamsCount || 0)})
                      </h4>
                    </div>
                    <span className="text-[9px] bg-orange-50 text-orange-700 font-extrabold px-2 py-0.5 rounded-md border border-orange-200 uppercase tracking-wide">
                      Riserve ⏱️
                    </span>
                  </div>

                  {filteredReserves.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400 italic py-4">Nessuna squadra riserva corrisponde ai criteri di ricerca.</p>
                  ) : (
                    <div id="teams-grid-reserves" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReserves.map((team, index) => renderTeamCard(team, index, true))}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            filteredTeams.length === 0 ? (
              <div id="no-teams-placeholder" className="text-center py-12 border-4 border-dashed border-slate-200 rounded-3xl bg-amber-50/50">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Nessuna squadra trovata</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">Registra la prima squadra o genera le demo per iniziare!</p>
              </div>
            ) : (
              <div id="teams-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTeams.map((team, index) => renderTeamCard(team, index, false))}
              </div>
            )
          )}

          {/* DEDICATED WITHDRAWN TEAMS SECTION */}
          {withdrawnTeams.length > 0 && (
            <div className="mt-10 pt-8 border-t-2 border-dashed border-slate-250 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide font-sans">
                    Squadre Ritirate / Sostituite ({withdrawnTeams.length})
                  </h4>
                </div>
                <span className="text-[9px] bg-rose-50 text-rose-700 font-extrabold px-2 py-0.5 rounded-md border border-rose-200 uppercase tracking-wide">
                  Ritirate / Escluse ❌
                </span>
              </div>

              <div id="teams-grid-withdrawn" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {withdrawnTeams
                  .filter((t) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.player1.toLowerCase().includes(q) ||
                      t.player2.toLowerCase().includes(q)
                    );
                  })
                  .map((team, index) => renderTeamCard(team, index, false))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Team Details & Edit Modal */}
      {selectedDetailsTeam && (
        <div id="team-details-modal" className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl border-4 border-sky-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {(() => {
              const editable = canWrite && (!isLocked || !isTournamentStarted);
              const ModalContent = (
                <>
                  {/* Modal Header */}
                  <div className="bg-sky-50 p-6 border-b-2 border-slate-100 flex justify-between items-start shrink-0">
                    <div className="flex-grow">
                      {editable ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase text-sky-700 tracking-wider">Nome Squadra *</label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm font-extrabold uppercase focus:outline-none focus:border-sky-500 bg-white text-slate-800"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-sky-700 tracking-wider mb-1.5">Livello di Gioco</label>
                            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/60 p-1 border border-slate-200">
                              {(['Beginner', 'Bronze', 'Silver', 'Gold'] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  id={`details-edit-lvl-${lvl}`}
                                  type="button"
                                  onClick={() => setEditLevel(lvl)}
                                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    editLevel === lvl
                                      ? 'bg-sky-500 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-slate-300/40'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="bg-sky-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-b-2 border-sky-700">
                              {selectedDetailsTeam.level}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-800 text-2xl mt-1.5 uppercase leading-none">
                            {selectedDetailsTeam.name}
                          </h3>
                        </>
                      )}
                      {canWrite && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                          Iscrizione: {(() => {
                            if (selectedDetailsTeam.registeredAt.includes(' ')) {
                              const [d, t] = selectedDetailsTeam.registeredAt.split(' ');
                              const parts = d.split('-');
                              if (parts.length === 3) {
                                const [y, m, dayVal] = parts;
                                return `${dayVal}/${m}/${y} alle ${t.substring(0, 5)}`;
                              }
                            }
                            return selectedDetailsTeam.registeredAt;
                          })()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      id="close-details-top-btn"
                      onClick={() => setSelectedDetailsTeam(null)}
                      className="text-slate-400 hover:text-slate-600 font-extrabold text-xl p-1 px-2.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shrink-0 ml-4 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 overflow-y-auto">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      {editable ? 'Informazioni e Modifica Componenti' : 'Informazioni di Contatto Componenti'}
                    </h4>

                    {/* Player 1 Details / Edit */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs font-black font-mono shrink-0">1</span>
                        {editable ? (
                          <div className="flex-grow">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Giocatore 1 *</label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-500 bg-white"
                              value={editPlayer1}
                              onChange={(e) => setEditPlayer1(e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="font-extrabold text-slate-800 text-sm uppercase">{selectedDetailsTeam.player1}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Phone P1 */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Telefono</span>
                          {editable ? (
                            <div className="space-y-1.5">
                              <input
                                type="tel"
                                placeholder="Inserisci cellulare"
                                className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-semibold focus:outline-none focus:border-sky-500 bg-white"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                              />
                              {editPhone ? (
                                <div className="grid grid-cols-2 gap-1">
                                  <a
                                    href={`tel:${editPhone}`}
                                    className="flex items-center justify-center gap-1 py-1 px-15 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-all"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    Chiama
                                  </a>
                                  <a
                                    href={getWhatsAppUrl(editPhone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 py-1 px-15 text-[9px] font-black uppercase bg-green-500 hover:bg-green-600 text-white rounded transition-all"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    WhatsApp
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {selectedDetailsTeam.phone && selectedDetailsTeam.phone !== 'Non specificato' ? (
                                <>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-black text-slate-700 font-mono tracking-wide truncate">{selectedDetailsTeam.phone}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(selectedDetailsTeam.phone, 'det-phone1')}
                                      className="text-[9px] font-black uppercase tracking-wider text-sky-600 hover:text-sky-850 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 transition-all shrink-0 cursor-pointer"
                                    >
                                      {copiedIdField === 'det-phone1' ? 'Copiato!' : 'Copia'}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 pt-1">
                                    <a
                                      href={`tel:${selectedDetailsTeam.phone}`}
                                      className="flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <Phone className="w-2.5 h-2.5 shrink-0" />
                                      Chiama
                                    </a>
                                    <a
                                      href={getWhatsAppUrl(selectedDetailsTeam.phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-black uppercase tracking-wider bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                      WhatsApp
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Non specificato</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Email P1 */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Email</span>
                          {editable ? (
                            <div className="space-y-1.5">
                              <input
                                type="email"
                                placeholder="Inserisci email"
                                className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold focus:outline-none focus:border-sky-500 bg-white"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                              {editEmail ? (
                                <a
                                  href={`mailto:${editEmail}`}
                                  className="w-full flex items-center justify-center gap-1 py-1 px-1 text-[9px] font-black uppercase bg-sky-500 hover:bg-sky-600 text-white rounded transition-all"
                                >
                                  <Mail className="w-2.5 h-2.5" />
                                  Email
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {selectedDetailsTeam.email && selectedDetailsTeam.email !== 'Non specificata' ? (
                                <>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-slate-700 truncate pr-1" title={selectedDetailsTeam.email}>{selectedDetailsTeam.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(selectedDetailsTeam.email, 'det-email1')}
                                      className="text-[9px] font-black uppercase tracking-wider text-sky-600 hover:text-sky-850 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 transition-all shrink-0 cursor-pointer"
                                    >
                                      {copiedIdField === 'det-email1' ? 'Copiato!' : 'Copia'}
                                    </button>
                                  </div>
                                  <div className="pt-1">
                                    <a
                                      href={`mailto:${selectedDetailsTeam.email}`}
                                      className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-black uppercase tracking-wider bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <Mail className="w-2.5 h-2.5 shrink-0" />
                                      Invia Email
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Non specificata</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Credenziali della Squadra */}
                      {(() => {
                        const teamUserObj = users.find(u => u.id === `team-user-${selectedDetailsTeam.id}`);
                        const fallbackUserObj = !teamUserObj ? users.find(u => u.isTeamUser && u.username.trim().toLowerCase() === selectedDetailsTeam.name.trim().toLowerCase()) : null;
                        const finalUserObj = teamUserObj || fallbackUserObj;

                        if (!finalUserObj) {
                          return (
                            <div className="bg-amber-55/40 border border-amber-250 rounded-xl p-3 text-center text-xs text-amber-800 font-bold mt-2.5">
                              ⚠️ Nessun account associato trovato per questa squadra nel database.
                            </div>
                          );
                        }

                        const inviteMsg = `Ciao,  
Per seguire in tempo reale il torneo Wsicily al quale sei iscritto collegati alla nostra web app all'indirizzo https://wsicily.vercel.app ed effettua il login con le tue credenziali di squadra:

Username: ${finalUserObj.username}
Password: ${finalUserObj.password}

Buon Divertimento!

Lo staff Wsicily!`;

                        const hasPhone = selectedDetailsTeam.phone && selectedDetailsTeam.phone !== 'Non specificato';
                        const p1PhoneTemp = hasPhone ? selectedDetailsTeam.phone : '';
                        const wpInviteUrl = getWhatsAppUrl(p1PhoneTemp) + `?text=${encodeURIComponent(inviteMsg)}`;

                        return (
                          <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3.5 mt-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-sky-600" />
                                Credenziali di Accesso Squadra 🔐
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs font-semibold bg-white p-2.5 rounded-lg border border-sky-100">
                              <div>
                                <div className="text-[9px] text-slate-400 uppercase font-bold">Username</div>
                                <div className="font-mono text-xs text-sky-950 truncate select-all">{finalUserObj.username}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 uppercase font-bold">Password</div>
                                <div className="font-mono text-xs text-orange-600 font-extrabold tracking-wider select-all">{finalUserObj.password}</div>
                              </div>
                            </div>

                            <div className="pt-1">
                              <a
                                href={wpInviteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-black uppercase tracking-wide bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg transition-all shadow-md cursor-pointer text-center"
                                id={`send-wp-creds-${selectedDetailsTeam.id}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Invia Credenziali via WhatsApp 💬
                              </a>
                              {!hasPhone && (
                                <p className="text-[8px] md:text-[9px] text-orange-650 font-bold mt-1 text-center leading-tight">
                                  * Nota: Numero di Player 1 mancante. WhatsApp richiederà di selezionare il contatto manualmente.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Player 2 Details / Edit */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs font-black font-mono shrink-0">2</span>
                        {editable ? (
                          <div className="flex-grow">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Giocatore 2 *</label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-500 bg-white"
                              value={editPlayer2}
                              onChange={(e) => setEditPlayer2(e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="font-extrabold text-slate-800 text-sm uppercase">{selectedDetailsTeam.player2}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Phone P2 */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Telefono</span>
                          {editable ? (
                            <div className="space-y-1.5">
                              <input
                                type="tel"
                                placeholder="Inserisci cellulare"
                                className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold focus:outline-none focus:border-sky-500 bg-white"
                                value={editPhone2}
                                onChange={(e) => setEditPhone2(e.target.value)}
                              />
                              {editPhone2 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  <a
                                    href={`tel:${editPhone2}`}
                                    className="flex items-center justify-center gap-1 py-1 px-15 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-all"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    Chiama
                                  </a>
                                  <a
                                    href={getWhatsAppUrl(editPhone2)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 py-1 px-15 text-[9px] font-black uppercase bg-green-500 hover:bg-green-600 text-white rounded transition-all"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    WhatsApp
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {selectedDetailsTeam.phone2 && selectedDetailsTeam.phone2 !== 'Non specificato' ? (
                                <>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-black text-slate-700 font-mono tracking-wide truncate">{selectedDetailsTeam.phone2}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(selectedDetailsTeam.phone2!, 'det-phone2')}
                                      className="text-[9px] font-black uppercase tracking-wider text-sky-600 hover:text-sky-850 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 transition-all shrink-0 cursor-pointer"
                                    >
                                      {copiedIdField === 'det-phone2' ? 'Copiato!' : 'Copia'}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 pt-1">
                                    <a
                                      href={`tel:${selectedDetailsTeam.phone2}`}
                                      className="flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <Phone className="w-2.5 h-2.5 shrink-0" />
                                      Chiama
                                    </a>
                                    <a
                                      href={getWhatsAppUrl(selectedDetailsTeam.phone2)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-black uppercase tracking-wider bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                      WhatsApp
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Non specificato</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Email P2 */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Email</span>
                          {editable ? (
                            <div className="space-y-1.5">
                              <input
                                type="email"
                                placeholder="Inserisci email"
                                className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold focus:outline-none focus:border-sky-500 bg-white"
                                value={editEmail2}
                                onChange={(e) => setEditEmail2(e.target.value)}
                              />
                              {editEmail2 ? (
                                <a
                                  href={`mailto:${editEmail2}`}
                                  className="w-full flex items-center justify-center gap-1 py-1 px-1 text-[9px] font-black uppercase bg-sky-500 hover:bg-sky-600 text-white rounded transition-all"
                                >
                                  <Mail className="w-2.5 h-2.5" />
                                  Email
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {selectedDetailsTeam.email2 && selectedDetailsTeam.email2 !== 'Non specificata' ? (
                                <>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-slate-700 truncate pr-1" title={selectedDetailsTeam.email2}>{selectedDetailsTeam.email2}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(selectedDetailsTeam.email2!, 'det-email2')}
                                      className="text-[9px] font-black uppercase tracking-wider text-sky-600 hover:text-sky-850 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 transition-all shrink-0 cursor-pointer"
                                    >
                                      {copiedIdField === 'det-email2' ? 'Copiato!' : 'Copia'}
                                    </button>
                                  </div>
                                  <div className="pt-1">
                                    <a
                                      href={`mailto:${selectedDetailsTeam.email2}`}
                                      className="w-full flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-black uppercase tracking-wider bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-lg transition-all shadow-xs"
                                    >
                                      <Mail className="w-2.5 h-2.5 shrink-0" />
                                      Invia Email
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Non specificata</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-3 shrink-0 col-span-2">
                    {editable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailsTeam(null)}
                          className="px-5 py-2.5 border-2 border-slate-205 text-slate-650 hover:bg-slate-100 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          id="save-unified-details-btn"
                          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black uppercase tracking-wider rounded-xl border-b-4 border-sky-700 transition-all shadow-md active:translate-y-0.5 cursor-pointer"
                        >
                          Salva Modifiche 💾
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        id="close-details-bottom-btn"
                        onClick={() => setSelectedDetailsTeam(null)}
                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-md cursor-pointer"
                      >
                        Chiudi
                      </button>
                    )}
                  </div>
                </>
              );

              return editable ? (
                <form onSubmit={handleEditSubmit} className="flex flex-col overflow-hidden max-h-[90vh]">
                  {ModalContent}
                </form>
              ) : (
                <div className="flex flex-col overflow-hidden max-h-[90vh]">
                  {ModalContent}
                </div>
              );
            })()}
          </motion.div>
        </div>
      )}

      {/* Sostituzione per Ritiro Modal */}
      {substituteConfirmTeam && (
        <div id="substitute-confirm-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-4 border-orange-300 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600 border border-orange-200 mb-2">
                <RefreshCw className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg uppercase font-sans">Sostituzione per Ritiro</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Stai dichiarando il ritiro della squadra <strong className="text-slate-800 uppercase">{substituteConfirmTeam.name}</strong>.
              </p>
            </div>
            
            {sortedReserves.length > 0 ? (
              <div className="bg-orange-50/50 p-4 border-2 border-orange-200 rounded-2xl text-left text-xs text-slate-700 font-semibold space-y-1">
                <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">Squadra subentrante (Prima Riserva):</span>
                <p className="font-bold text-slate-900 leading-tight uppercase text-sm">🎖️ {sortedReserves[0].name}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  Componenti: {sortedReserves[0].player1} &amp; {sortedReserves[0].player2} ({sortedReserves[0].level})
                </p>
              </div>
            ) : (
              <div className="bg-rose-50 p-4 border border-rose-250 rounded-2xl text-left text-xs text-rose-800 font-semibold text-center">
                Non ci sono squadre disponibili nella lista delle riserve per effettuare questa sostituzione!
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-bold leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-200">
              * Nota: La sostituzione comporterà la modifica della lista d'ingresso e la rigenerazione immediata di tutto il tabellone e del calendario del torneo. Questa operazione è irreversibile.
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSubstituteConfirmTeam(null)}
                className="px-4 py-2 border-2 border-slate-250 rounded-full text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all font-sans"
              >
                Annulla
              </button>
              {sortedReserves.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onSubstituteTeam) {
                      onSubstituteTeam(substituteConfirmTeam.id, sortedReserves[0].id);
                    }
                    setSubstituteConfirmTeam(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-black rounded-full text-xs uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
                >
                  Conferma e Sostituisci
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTeam(substituteConfirmTeam.id);
                    setSubstituteConfirmTeam(null);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-full text-xs uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
                >
                  Conferma Ritiro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Overlay Dialogs for Reset/Clear confirmations */}
      {showResetConfirm !== null && (
        <div id="reset-confirm-modal" className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border-4 border-rose-450 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border-2 border-rose-300 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-xs mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-850 uppercase italic text-lg leading-tight">Azzera & Rigenera?</h3>
              <p className="text-xs text-slate-550 font-semibold leading-relaxed">
                Il torneo è già in corso o configurato. Se procedi, **tutte le gare correnti e i record dei punti verranno cancellati in modo definitivo** per caricare le squadre demo selezionate.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                id="reset-modal-cancel"
                type="button"
                onClick={() => setShowResetConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl border border-slate-350 transition-all font-sans cursor-pointer"
              >
                Annulla
              </button>
              <button
                id="reset-modal-ok"
                type="button"
                onClick={() => {
                  const count = showResetConfirm;
                  setShowResetConfirm(null);
                  onLoadDemoTeams(count);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-sm font-sans cursor-pointer"
              >
                Sì, Carica Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div id="clear-confirm-modal" className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border-4 border-rose-450 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border-2 border-rose-300 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-xs mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-rose-750 uppercase italic text-lg leading-tight">Rimuovi Roster?</h3>
              <p className="text-xs text-slate-550 font-semibold leading-relaxed">
                Stai eliminando **tutte le {teams.length} squadre iscritte**. Se procedi, anche tutte le eventuali gare collegate verranno totalmente rimosse. Questa operazione non può essere annullata.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                id="clear-modal-cancel"
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl border border-slate-350 transition-all font-sans cursor-pointer"
              >
                Annulla
              </button>
              <button
                id="clear-modal-ok"
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearAllTeams();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-sm font-sans cursor-pointer"
              >
                Sì, Elimina tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {teamToDelete !== null && (
        <div id="delete-team-confirm-modal" className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-4 border-rose-450 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border-2 border-rose-300 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-xs mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-rose-750 uppercase italic text-lg leading-tight">Elimina / Ritira Squadra?</h3>
              <p className="text-xs text-slate-550 font-semibold leading-relaxed">
                Sei sicuro di voler effettuare il ritiro o la cancellazione della squadra <strong className="text-slate-850 font-black">"{teamToDelete.name}"</strong>?
                {isLocked && (
                  <span className="block mt-1.5 text-rose-600 font-extrabold">
                    ⚠️ Nota: Il torneo è bloccato. Questa operazione ricalcolerà immediatamente il tabellone.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 font-sans">
              <button
                id="delete-team-modal-cancel"
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl border border-slate-350 transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                id="delete-team-modal-ok"
                type="button"
                onClick={() => {
                  onDeleteTeam(teamToDelete.id);
                  setTeamToDelete(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Sì, Ritiro / Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
