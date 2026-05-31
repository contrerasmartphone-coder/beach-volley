import React, { useState, useEffect } from 'react';
import { Team, Match, NotificationLog } from './types';
import { DEMO_TEAMS, getInitialTeamStats, generateDirectEliminationBracket, splitTeamsIntoGroups, generateRoundRobinMatches, generateDoubleEliminationBracket, autoResolveAndPropagate, sortTeamsByEntryList } from './utils';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import StandingsTab from './components/StandingsTab';
import NotificationCenter from './components/NotificationCenter';
import { Sun, Award, Users, Bell, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'teams' | 'bracket' | 'standings' | 'notifications'>('teams');

  // State initialized from localStorage
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('bv_teams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem('bv_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem('bv_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [admittedTeamsCount, setAdmittedTeamsCount] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('bv_admitted_teams_count');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTournamentConfig, setActiveTournamentConfig] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('bv_active_tournament_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persists state changes to localStorage
  useEffect(() => {
    localStorage.setItem('bv_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('bv_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('bv_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (admittedTeamsCount !== null) {
      localStorage.setItem('bv_admitted_teams_count', JSON.stringify(admittedTeamsCount));
    } else {
      localStorage.removeItem('bv_admitted_teams_count');
    }
  }, [admittedTeamsCount]);

  useEffect(() => {
    if (activeTournamentConfig !== null) {
      localStorage.setItem('bv_active_tournament_config', JSON.stringify(activeTournamentConfig));
    } else {
      localStorage.removeItem('bv_active_tournament_config');
    }
  }, [activeTournamentConfig]);

  // TEAM MANAGER ACTIONS
  const handleAddTeam = (newTeam: Team) => {
    if (matches.length > 0) return;
    setTeams((prev) => [newTeam, ...prev]);
    
    // Auto notification
    const addedNotif: NotificationLog = {
      id: `notif-add-${Date.now()}`,
      title: 'Nuova Iscrizione Completata! 🏝️',
      message: `La squadra "${newTeam.name}" (coppia: ${newTeam.player1} - ${newTeam.player2}) si è iscritta ufficialmente con livello di gioco: ${newTeam.level}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };
    setNotifications((prev) => [addedNotif, ...prev]);
  };

  const handleDeleteTeam = (id: string) => {
    if (matches.length > 0) return;
    const deleted = teams.find((t) => t.id === id);
    setTeams((prev) => prev.filter((t) => t.id !== id));
    
    if (deleted) {
      const rmNotif: NotificationLog = {
        id: `notif-rm-${Date.now()}`,
        title: 'Iscrizione cancellata 🗑️',
        message: `La squadra "${deleted.name}" si è ritirata dal torneo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
      };
      setNotifications((prev) => [rmNotif, ...prev]);
    }
  };

  const handleEditTeam = (updatedTeam: Team) => {
    if (matches.length > 0) return;
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === updatedTeam.id) {
          return {
            ...t,
            name: updatedTeam.name,
            player1: updatedTeam.player1,
            player2: updatedTeam.player2,
            level: updatedTeam.level,
            phone: updatedTeam.phone,
            email: updatedTeam.email,
          };
        }
        return t;
      })
    );

    setMatches((prevMatches) =>
      prevMatches.map((m) => {
        let updated = false;
        let newTeam1 = m.team1;
        let newTeam2 = m.team2;

        if (m.team1 && m.team1.id === updatedTeam.id) {
          newTeam1 = {
            ...m.team1,
            name: updatedTeam.name,
            player1: updatedTeam.player1,
            player2: updatedTeam.player2,
            level: updatedTeam.level,
            phone: updatedTeam.phone,
            email: updatedTeam.email,
          };
          updated = true;
        }
        if (m.team2 && m.team2.id === updatedTeam.id) {
          newTeam2 = {
            ...m.team2,
            name: updatedTeam.name,
            player1: updatedTeam.player1,
            player2: updatedTeam.player2,
            level: updatedTeam.level,
            phone: updatedTeam.phone,
            email: updatedTeam.email,
          };
          updated = true;
        }

        if (updated) {
          return {
            ...m,
            team1: newTeam1,
            team2: newTeam2,
          };
        }
        return m;
      })
    );

    const updateNotif: NotificationLog = {
      id: `notif-edit-${Date.now()}`,
      title: 'Squadra Modificata ✏️',
      message: `I dettagli della squadra "${updatedTeam.name}" sono stati aggiornati con successo.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };
    setNotifications((prev) => [updateNotif, ...prev]);
  };

  const handleLoadDemoTeams = (count: number) => {
    if (matches.length > 0) return;
    
    const selectedDemos: Team[] = [];
    const adjective = ['Sand Stormers', 'Golden Blocks', 'Sky Jumpers', 'Beach Aces', 'Wave Riders', 'Spike Kings', 'Sideout Pros', 'Sun Blockers', 'Vento d\'Estate', 'Pazzi della Sabbia', 'Beach Boys', 'Hot Spikes', 'Bassa Difesa', 'Sabbia Caliente', 'Net Rippers', 'Volley Monsters', 'Sea Wolves', 'Coastal Giants', 'Sardine Smashers', 'Dune Defenders', 'Ocean Breakers', 'Tidal Voyagers'];
    const names = ['Alessandro', 'Marco', 'Filippo', 'Guido', 'Luca', 'Matteo', 'Simone', 'Davide', 'Claudio', 'Fabio', 'Andrea', 'Giorgio', 'Stefano', 'Roberto', 'Enrico', 'Gianni', 'Emanuele', 'Pietro', 'Daniele', 'Lorenzo', 'Alberto', 'Federico', 'Gabriele', 'Valerio', 'Michele', 'Salvatore', 'Vincenzo', 'Antonio', 'Giuseppe', 'Fabrizio', 'Christian', 'Manuel'];
    const surnames = ['Rossi', 'Bianchi', 'Neri', 'Verdi', 'Ferrari', 'Colombo', 'Ricci', 'Bruno', 'Moretti', 'Rizzo', 'Mancini', 'Costa', 'Gallo', 'Conti', 'Villa', 'Serra', 'Gatti', 'Fontana', 'Marini', 'Greco', 'Barbieri', 'Leone', 'Longo', 'Martinelli', 'Esposito', 'Romano', 'Vitale', 'De Luca', 'Cozza', 'Russo', 'Bernardi', 'Pellegrini'];
    const levels: ('Beginner' | 'Bronze' | 'Silver' | 'Gold')[] = ['Gold', 'Silver', 'Bronze', 'Beginner'];

    for (let i = 0; i < count; i++) {
      if (i < DEMO_TEAMS.length) {
        selectedDemos.push(getInitialTeamStats(DEMO_TEAMS[i] as any));
      } else {
        const p1Name = names[i % names.length];
        const p1Surname = surnames[(i + 3) % surnames.length];
        const p2Name = names[(i + 7) % names.length];
        const p2Surname = surnames[(i + 11) % surnames.length];
        const level = levels[i % levels.length];
        
        const dateObj = new Date(new Date('2026-05-26 10:00:00').getTime() + i * 15 * 60000);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const minVal = String(dateObj.getMinutes()).padStart(2, '0');
        const registeredStr = `${yyyy}-${mm}-${dd} ${hh}:${minVal}`;

        const generatedTeam: Omit<Team, 'wins' | 'losses' | 'setsWon' | 'setsLost' | 'pointsWon' | 'pointsLost' | 'points'> = {
          id: `t${i + 1}`,
          name: `${adjective[i % adjective.length]} ${Math.floor(i / adjective.length) + 1}`,
          player1: `${p1Name} ${p1Surname}`,
          player2: `${p2Name} ${p2Surname}`,
          level,
          phone: `33${Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8)}`,
          email: `${p1Name.toLowerCase()}.${p1Surname.toLowerCase()}@example.com`,
          phone2: `34${Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8)}`,
          email2: `${p2Name.toLowerCase()}.${p2Surname.toLowerCase()}@example.com`,
          registeredAt: registeredStr
        };
        selectedDemos.push(getInitialTeamStats(generatedTeam as any));
      }
    }

    setTeams(selectedDemos);
    setMatches([]); // Clear any previous tournament bracket on roster reload

    const demNotif: NotificationLog = {
      id: `notif-demo-${Date.now()}`,
      title: 'Squadre Demo Precaricate 🏐',
      message: `Il roster è stato caricato con ${count} coppie di beach volley. Il tabellone è ora pronto per essere configurato!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };
    setNotifications((prev) => [demNotif, ...prev]);
  };

  const handleClearAllTeams = () => {
    if (matches.length > 0) return;
    setTeams([]);
    setMatches([]);
    setNotifications([]);
  };

  // TOURNAMENT BRACKET GENERATION (Supports Direct Elimination, Pool Play, and Combined Phases)
  const handleGenerateTournament = (config: {
    name: string;
    formula: 'direct' | 'pools' | 'combined' | 'double_elim';
    teamsCount: number;
    groupCount: number;
    courtCount: number;
    pointsPerSet?: 15 | 21;
    maxSets?: 1 | 3;
    sfPointsPerSet?: 15 | 21;
    sfMaxSets?: 1 | 3;
  }, teamsToUse: Team[] = teams) => {
    setAdmittedTeamsCount(config.teamsCount);
    setActiveTournamentConfig(config);

    const startHour = '09:00';
    let matchDuration = 40;
    if (config.maxSets === 1) {
      if (config.pointsPerSet === 15) matchDuration = 15;
      else if (config.pointsPerSet === 21) matchDuration = 20;
    } else if (config.maxSets === 3) {
      if (config.pointsPerSet === 15) matchDuration = 45;
      else if (config.pointsPerSet === 21) matchDuration = 50;
    }

    // Sort teams by the centralized Entry List ranking criteria: Game Level, then registration date/time.
    const sortedTeams = sortTeamsByEntryList<Team>(teamsToUse);

    // Reset previous team group and stats for a clean state
    const clearedTeams = sortedTeams.map((team) => {
      const { group: _, ...rest } = team;
      return {
        ...rest,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        points: 0,
      } as Team;
    });

    if (config.formula === 'double_elim') {
      // 4. Vincenti e Perdenti (Double Elimination) FOR exactly 8 teams
      const seededMatches = generateDoubleEliminationBracket(
        clearedTeams,
        startHour,
        matchDuration,
        config.pointsPerSet,
        config.maxSets,
        config.sfPointsPerSet,
        config.sfMaxSets
      );

      // Remove any group association in play
      const fullyClearedTeams = clearedTeams.map(t => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      setTeams(fullyClearedTeams);
      setMatches(seededMatches);

      const initNotif: NotificationLog = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone Vincenti & Perdenti "${config.name}" Pubblicato!`,
        message: `È stata generata la modalità a doppia eliminazione con tabellone di qualificazione, vincenti, perdenti, semifinali e finalissima! Le sfide iniziano sul sabbioso dalle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };
      setNotifications((prev) => [initNotif, ...prev]);

    } else if (config.formula === 'direct') {
      // 1. Direct Elimination ONLY
      const seededMatches = generateDirectEliminationBracket(
        clearedTeams,
        config.teamsCount as number,
        startHour,
        matchDuration,
        config.pointsPerSet,
        config.maxSets,
        config.sfPointsPerSet,
        config.sfMaxSets
      );
      
      const formatted = seededMatches.map(m => ({
        ...m,
        phase: 'eliminazione' as const,
        groupName: undefined
      }));

      // Remove any group association in direct play
      const fullyClearedTeams = clearedTeams.map(t => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      setTeams(fullyClearedTeams);
      setMatches(formatted);

      const initNotif: NotificationLog = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone "${config.name}" Pubblicato!`,
        message: `È stata generata la fase a eliminazione diretta per ${config.teamsCount} squadre. Le prime partite inizieranno sul sabbioso alle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };
      setNotifications((prev) => [initNotif, ...prev]);

    } else if (config.formula === 'pools') {
      // 2. Pools / Group stage ONLY (Fase a Gironi)
      const chronologicallySortedPools = [...clearedTeams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
      const admittedPoolsRaw = chronologicallySortedPools.slice(0, config.teamsCount);
      const selectedTeams = sortTeamsByEntryList(admittedPoolsRaw);
      let byeCount = 1;
      while (selectedTeams.length < config.teamsCount) {
        selectedTeams.push({
          id: `bye_pool_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: 'N/A',
          player2: 'N/A',
          level: 'Beginner',
          registeredAt: '2026-05-27',
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
        } as Team);
      }
      const groups = splitTeamsIntoGroups(selectedTeams, config.groupCount);
      
      // Update teams in list to assign their groups
      const updatedTeams = clearedTeams.map(t => {
        const foundGroupName = Object.keys(groups).find(groupKey => groups[groupKey].some(gt => gt.id === t.id));
        if (foundGroupName) {
          return { ...t, group: foundGroupName };
        }
        return t;
      });

      const groupMatches = generateRoundRobinMatches(
        groups,
        startHour,
        matchDuration,
        config.courtCount,
        config.pointsPerSet,
        config.maxSets
      );

      setTeams(updatedTeams);
      setMatches(groupMatches);

      const initNotif: NotificationLog = {
        id: `notif-init-${Date.now()}`,
        title: `🏐 Gironi del Torneo "${config.name}" Generati!`,
        message: `Sono stati configurati ${config.groupCount} gironi all'italiana (${Object.keys(groups).map(k => `${k}: ${groups[k].length} sq.`).join(', ')}). Controlla il calendario gare!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };
      setNotifications((prev) => [initNotif, ...prev]);

    } else {
      // 3. Combined: Phase 1 (Gironi) + Phase 2 (Playoffs Bracket)
      const chronologicallySortedCombined = [...clearedTeams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
      const admittedCombinedRaw = chronologicallySortedCombined.slice(0, config.teamsCount);
      const selectedTeams = sortTeamsByEntryList(admittedCombinedRaw);
      let byeCount = 1;
      while (selectedTeams.length < config.teamsCount) {
        selectedTeams.push({
          id: `bye_combined_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: 'N/A',
          player2: 'N/A',
          level: 'Beginner',
          registeredAt: '2026-05-27',
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          points: 0,
        } as Team);
      }
      const groups = splitTeamsIntoGroups(selectedTeams, config.groupCount);

      const updatedTeams = clearedTeams.map(t => {
        const foundGroupName = Object.keys(groups).find(groupKey => groups[groupKey].some(gt => gt.id === t.id));
        if (foundGroupName) {
          return { ...t, group: foundGroupName };
        }
        return t;
      });

      const groupMatches = generateRoundRobinMatches(
        groups,
        startHour,
        matchDuration,
        config.courtCount,
        config.pointsPerSet,
        config.maxSets
      );

      setTeams(updatedTeams);
      setMatches(groupMatches);

      const initNotif: NotificationLog = {
        id: `notif-init-${Date.now()}`,
        title: `🥇 Torneo "${config.name}" - Fasi Multiple Iniziate!`,
        message: `Fase 1 (Gironi): ${config.groupCount} gironi generati. I migliori qualificati accederanno alla Fase 2 (Tabellone Playoff ad Eliminazione). In bocca al lupo!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };
      setNotifications((prev) => [initNotif, ...prev]);
    }

    // Force focus to bracket/matches viewing tab
    setActiveTab('bracket');
  };

  const handleSubstituteTeam = (withdrawnTeamId: string, promotedTeamId: string) => {
    const withdrawnTeam = teams.find(t => t.id === withdrawnTeamId);
    const promotedTeam = teams.find(t => t.id === promotedTeamId);
    if (!withdrawnTeam || !promotedTeam) return;

    // Swap registeredAt timestamps to swap their chronological rank
    const updatedTeams = teams.map(t => {
      if (t.id === withdrawnTeamId) {
        return { 
          ...t, 
          registeredAt: promotedTeam.registeredAt,
          name: t.name.endsWith(' [RITIRATA]') ? t.name : `${t.name} [RITIRATA]`
        };
      }
      if (t.id === promotedTeamId) {
        const cleanName = t.name.replace(' [RITIRATA]', '');
        return { 
          ...t, 
          name: cleanName,
          registeredAt: withdrawnTeam.registeredAt 
        };
      }
      return t;
    });

    setTeams(updatedTeams);

    // Add notification about substitution
    const swapNotif: NotificationLog = {
      id: `notif-sub-${Date.now()}`,
      title: '🔄 Sostituzione per Ritiro',
      message: `La squadra "${withdrawnTeam.name}" si è ritirata ed è stata sostituita da "${promotedTeam.name}". Il roster e il calendario del torneo sono stati aggiornati!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'schedule_change',
    };
    setNotifications((prev) => [swapNotif, ...prev]);

    // Regenerate bracket immediately with updatedTeams
    if (activeTournamentConfig) {
      handleGenerateTournament(activeTournamentConfig, updatedTeams);
    }
  };

  const handleUpdateMatches = (newMatches: Match[]) => {
    if (newMatches.length === 0) {
      setAdmittedTeamsCount(null);
      setActiveTournamentConfig(null);
    }
    setMatches(autoResolveAndPropagate(newMatches));
  };

  // EXPLICIT NOTIFICATION EMITTERS
  const handleAddNotification = (notification: NotificationLog) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Counts of pending notifications or live games to show alert counters
  const activeLiveGamesCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div id="main-beach-app-shell" className="min-h-screen bg-amber-50 text-slate-800 font-sans antialiased pb-0 border-0 md:border-8 border-sky-400 flex flex-col selection:bg-orange-200">
      {/* Main Header Container */}
      <header id="beach-app-header-sec" className="bg-sky-500 text-white shadow-lg border-b-4 border-sky-600">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 text-orange-500 rounded-full shadow-md shrink-0">
              <Sun className="w-8 h-8 md:w-10 md:h-10 text-orange-500 animate-[spin_20s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic leading-none text-white drop-shadow-sm">
                Beach Volley Hub
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-sky-100 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span>🏖️ AREA CAMPIONATI SU SABBIA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
                <span>REAL-TIME DECK</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Banner / Helper */}
          <div className="flex items-center gap-3 md:gap-4 bg-sky-600/70 border-2 border-sky-400/50 py-1.5 px-4 md:py-2 md:px-5 rounded-2xl shadow-inner text-[11px] md:text-xs text-white">
            <div className="text-center">
              <div className="text-sky-200 font-extrabold text-[9px] md:text-[10px] uppercase tracking-wider">Squadre</div>
              <div id="quick-panel-teams-count" className="font-extrabold text-orange-300 text-xs md:text-sm">{teams.length}</div>
            </div>
            <div className="h-6 md:h-8 w-px bg-sky-400/50"></div>
            <div className="text-center">
              <div className="text-sky-200 font-extrabold text-[9px] md:text-[10px] uppercase tracking-wider">Stato Cup</div>
              <div id="quick-panel-tournament-status" className="font-bold text-white uppercase italic text-[11px] md:text-xs">
                {matches.length > 0 ? (matches.every((m) => m.status === 'completed') ? 'FINITO 🎉' : 'IN CORSO 🏖️') : 'SETUP 🛠️'}
              </div>
            </div>
            {activeLiveGamesCount > 0 && (
              <>
                <div className="h-6 md:h-8 w-px bg-sky-400/50"></div>
                <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 md:py-1 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-wider animate-pulse">
                  <span className="h-1 w-1 rounded-full bg-white block animate-ping"></span>
                  {activeLiveGamesCount} LIVE
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Tab Controls Layout */}
        <div className="bg-sky-600/30 border-t border-sky-400/30 py-2.5 md:py-3">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <nav id="app-nav-row" className="flex overflow-x-auto gap-2 md:gap-3 py-1 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                { id: 'teams', label: 'Lista Ingresso', count: teams.length, icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'bracket', label: 'Gare', count: matches.length, icon: <Award className="w-3.5 h-3.5" /> },
                { id: 'standings', label: 'Classifiche', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                { id: 'notifications', label: 'Notifiche', count: notifications.length, icon: <Bell className="w-3.5 h-3.5" /> }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-1.5 px-3.5 md:py-2 md:px-6 text-[11px] md:text-xs font-black uppercase tracking-wider rounded-full border-b-2 md:border-b-4 transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-orange-400 hover:bg-orange-500 text-white border-orange-600 shadow-md scale-105 active:translate-y-0.5'
                        : 'bg-white hover:bg-amber-100 text-sky-900 border-sky-300 hover:border-sky-400 shadow-sm'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`text-[9px] md:text-[10px] px-1 py-0.1 rounded-md font-black ${isActive ? 'bg-orange-700 text-white' : 'bg-sky-100 text-sky-850'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Sandbox Workspace Frame */}
      <main className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <TeamsTab
                teams={teams}
                onAddTeam={handleAddTeam}
                onEditTeam={handleEditTeam}
                onDeleteTeam={handleDeleteTeam}
                onLoadDemoTeams={handleLoadDemoTeams}
                onClearAllTeams={handleClearAllTeams}
                isLocked={matches.length > 0}
                admittedTeamsCount={admittedTeamsCount}
                isTournamentStarted={matches.some(m => m.status === 'completed' || m.status === 'live' || m.sets.length > 0)}
                onSubstituteTeam={handleSubstituteTeam}
              />
            </motion.div>
          )}

          {activeTab === 'bracket' && (
            <motion.div
              key="bracket"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <BracketTab
                teams={teams}
                matches={matches}
                onUpdateMatches={handleUpdateMatches}
                onGenerateTournament={handleGenerateTournament}
                onAddNotification={handleAddNotification}
              />
            </motion.div>
          )}

          {activeTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <StandingsTab teams={teams} matches={matches} />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <NotificationCenter
                notifications={notifications}
                teams={teams}
                onAddNotification={handleAddNotification}
                onClearNotifications={handleClearNotifications}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Ticker */}
      <footer className="mt-12 bg-emerald-500 h-14 flex items-center overflow-hidden whitespace-nowrap shadow-inner border-t-4 border-emerald-600">
        <div className="bg-emerald-700 px-6 h-full flex items-center font-black text-white italic tracking-wider text-xs shrink-0">
          PROSSIMI MATCH
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center space-x-12 px-6 text-emerald-50 font-black text-xs uppercase tracking-wider animate-pulse">
            {matches.filter(m => m.status === 'scheduled').length > 0 ? (
              matches.filter(m => m.status === 'scheduled').map((m, idx) => (
                <span key={m.id || idx}>
                  ⏱️ {m.scheduledTime} - CAMPO {m.court}: {m.team1Name} VS {m.team2Name}
                </span>
              ))
            ) : (
              <>
                <span>16:45 - CAMPO 2: BEACH ACES VS SANDY BULLS</span>
                <span>17:15 - CAMPO 1: OCEAN GIANTS VS VOLLEY STARS</span>
                <span>18:00 - CAMPO 3: THE SPIKERS VS NET MASTERS</span>
                <span>REGISTRA SQUADRE E GENERA IL TABELLONE PER AGGIORNARE LA LISTA</span>
              </>
            )}
          </div>
        </div>
        <div className="hidden md:flex bg-emerald-900 text-emerald-300 text-[10px] uppercase tracking-widest font-black px-4 h-full items-center shrink-0">
          BEACH HUB 2026
        </div>
      </footer>
    </div>
  );
}
