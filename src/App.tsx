import React, { useState, useEffect } from 'react';
import { Team, Match, NotificationLog, AppUser, ArchivedTournament } from './types';
import { DEMO_TEAMS, getInitialTeamStats, generateDirectEliminationBracket, splitTeamsIntoGroups, generateRoundRobinMatches, generateDoubleEliminationBracket, autoResolveAndPropagate, sortTeamsByEntryList, recalculateTournamentStages } from './utils';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import StandingsTab from './components/StandingsTab';
import NotificationCenter from './components/NotificationCenter';
import ArchiveTab from './components/ArchiveTab';
import UserTab from './components/UserTab';
import { Sun, Award, Users, Bell, Sparkles, TrendingUp, HelpCircle, Shield, Trophy, Check, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, cleanObject } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState<'teams' | 'bracket' | 'standings' | 'notifications' | 'archive' | 'users'>('teams');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('bv_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [archives, setArchives] = useState<ArchivedTournament[]>([]);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // State initialized from localStorage (cached copy)
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

  // Synced from Firestore in real-time for all connected users
  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const list: Team[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Team);
      });
      list.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
      setTeams(list);
    }, (error) => {
      console.error("Firestore sync error (teams):", error);
    });

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const list: Match[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Match);
      });
      list.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.position - b.position;
      });
      setMatches(list);
    }, (error) => {
      console.error("Firestore sync error (matches):", error);
    });

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const list: NotificationLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as NotificationLog);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      setNotifications(list);
    }, (error) => {
      console.error("Firestore sync error (notifications):", error);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.admittedTeamsCount !== undefined) setAdmittedTeamsCount(data.admittedTeamsCount);
        if (data.activeTournamentConfig !== undefined) setActiveTournamentConfig(data.activeTournamentConfig);
      } else {
        setAdmittedTeamsCount(null);
        setActiveTournamentConfig(null);
      }
    }, (error) => {
      console.error("Firestore sync error (config):", error);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AppUser);
      });
      list.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(list);
    }, (error) => {
      console.error("Firestore sync error (users):", error);
    });

    const unsubArchives = onSnapshot(collection(db, 'archives'), (snapshot) => {
      const list: ArchivedTournament[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ArchivedTournament);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      setArchives(list);
    }, (error) => {
      console.error("Firestore sync error (archives):", error);
    });

    return () => {
      unsubTeams();
      unsubMatches();
      unsubNotifs();
      unsubConfig();
      unsubUsers();
      unsubArchives();
    };
  }, []);

  // Maintain local storage persistence cache as instant fallback
  useEffect(() => {
    localStorage.setItem('bv_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('bv_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('bv_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Sync logged user state to local caching
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bv_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('bv_current_user');
    }
  }, [currentUser]);

  // Seed default admin in Firestore if user list is empty
  useEffect(() => {
    if (users.length === 0) {
      const seedDefaultAdmin = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          if (snapshot.empty) {
            const adminUser: AppUser = {
              id: 'contrera.service@gmail.com',
              username: 'contrera.service@gmail.com',
              password: 'admin',
              role: 'admin',
              createdAt: new Date().toLocaleDateString('it-IT')
            };
            await setDoc(doc(db, 'users', adminUser.id), adminUser);
            console.log("Pre-loaded root admin account successfully.");
          }
        } catch (err) {
          console.error("Bootstrapping default admin failed:", err);
        }
      };
      seedDefaultAdmin();
    }
  }, [users]);

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

  const clearCollection = async (collectionName: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const promises = snap.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
      await Promise.all(promises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    }
  };

  // TEAM MANAGER ACTIONS
  const handleAddTeam = async (newTeam: Team) => {
    if (matches.length > 0) return;
    
    // Auto notification
    const addedNotif: NotificationLog = {
      id: `notif-add-${Date.now()}`,
      title: 'Nuova Iscrizione Completata! 🏝️',
      message: `La squadra "${newTeam.name}" (coppia: ${newTeam.player1} - ${newTeam.player2}) si è iscritta ufficialmente con livello di gioco: ${newTeam.level}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };

    try {
      await setDoc(doc(db, 'teams', newTeam.id), newTeam);
      await setDoc(doc(db, 'notifications', addedNotif.id), addedNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${newTeam.id}`);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    const isTournamentStarted = matches.some(m => m.status === 'completed' || m.status === 'live' || m.sets.length > 0);
    if (matches.length > 0 && isTournamentStarted) return;
    const deleted = teams.find((t) => t.id === id);
    if (!deleted) return;
    
    try {
      await deleteDoc(doc(db, 'teams', id));
      const rmNotif: NotificationLog = {
        id: `notif-rm-${Date.now()}`,
        title: 'Iscrizione cancellata 🗑️',
        message: `La squadra "${deleted.name}" si è ritirata dal torneo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
      };
      await setDoc(doc(db, 'notifications', rmNotif.id), cleanObject(rmNotif));

      if (matches.length > 0 && !isTournamentStarted && activeTournamentConfig) {
        const remainingTeams = teams.filter(t => t.id !== id);
        await handleGenerateTournament(activeTournamentConfig, remainingTeams);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${id}`);
    }
  };

  const handleEditTeam = async (updatedTeam: Team) => {
    const isTournamentStarted = matches.some(m => m.status === 'completed' || m.status === 'live' || m.sets.length > 0);
    if (matches.length > 0 && isTournamentStarted) return;

    const updateNotif: NotificationLog = {
      id: `notif-edit-${Date.now()}`,
      title: 'Squadra Modificata ✏️',
      message: `I dettagli della squadra "${updatedTeam.name}" sono stati aggiornati con successo.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };

    try {
      await setDoc(doc(db, 'teams', updatedTeam.id), updatedTeam);
      await setDoc(doc(db, 'notifications', updateNotif.id), updateNotif);

      // Map and write matches update in parallel if needed
      const matchesPromises = matches.map(async (m) => {
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
          await setDoc(doc(db, 'matches', m.id), {
            ...m,
            team1: newTeam1,
            team2: newTeam2,
          });
        }
      });
      await Promise.all(matchesPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${updatedTeam.id}`);
    }
  };

  const handleLoadDemoTeams = async (count: number) => {
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
        
        const dateObj = new Date(new Date('2026-05-26T10:00:00').getTime() + i * 15 * 60000);
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

    const demNotif: NotificationLog = {
      id: `notif-demo-${Date.now()}`,
      title: 'Squadre Demo Precaricate 🏐',
      message: `Il roster è stato caricato con ${count} coppie di beach volley. Il tabellone è ora pronto per essere configurato!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    };

    try {
      await clearCollection('teams');
      await clearCollection('matches');
      await clearCollection('notifications');
      await deleteDoc(doc(db, 'config', 'settings'));

      const teamPromises = selectedDemos.map((team) => setDoc(doc(db, 'teams', team.id), team));
      await Promise.all(teamPromises);
      await setDoc(doc(db, 'notifications', demNotif.id), demNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teams_demo');
    }
  };

  const handleClearAllTeams = async () => {
    try {
      await clearCollection('teams');
      await clearCollection('matches');
      await clearCollection('notifications');
      await deleteDoc(doc(db, 'config', 'settings'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'all');
    }
  };

  // TOURNAMENT BRACKET GENERATION (Supports Direct Elimination, Pool Play, and Combined Phases)
  const handleGenerateTournament = async (config: {
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

    let generatedMatches: Match[] = [];
    let updatedTeams: Team[] = clearedTeams;
    let initNotif: NotificationLog;

    if (config.formula === 'double_elim') {
      // 4. Vincenti e Perdenti (Double Elimination) FOR exactly 8 teams
      generatedMatches = generateDoubleEliminationBracket(
        clearedTeams,
        startHour,
        matchDuration,
        config.pointsPerSet,
        config.maxSets,
        config.sfPointsPerSet,
        config.sfMaxSets
      );

      // Remove any group association in play
      updatedTeams = clearedTeams.map(t => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone Vincenti & Perdenti "${config.name}" Pubblicato!`,
        message: `È stata generata la modalità a doppia eliminazione con tabellone di qualificazione, vincenti, perdenti, semifinali e finalissima! Le sfide iniziano sul sabbioso dalle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };

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
      
      generatedMatches = seededMatches.map(m => ({
        ...m,
        phase: 'eliminazione' as const,
        groupName: undefined
      }));

      // Remove any group association in direct play
      updatedTeams = clearedTeams.map(t => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone "${config.name}" Pubblicato!`,
        message: `È stata generata la fase a eliminazione diretta per ${config.teamsCount} squadre. Le prime partite inizieranno sul sabbioso alle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };

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
      updatedTeams = clearedTeams.map(t => {
        const foundGroupName = Object.keys(groups).find(groupKey => groups[groupKey].some(gt => gt.id === t.id));
        if (foundGroupName) {
          return { ...t, group: foundGroupName };
        }
        return t;
      });

      generatedMatches = generateRoundRobinMatches(
        groups,
        startHour,
        matchDuration,
        config.courtCount,
        config.pointsPerSet,
        config.maxSets
      );

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏐 Gironi del Torneo "${config.name}" Generati!`,
        message: `Sono stati configurati ${config.groupCount} gironi all'italiana (${Object.keys(groups).map(k => `${k}: ${groups[k].length} sq.`).join(', ')}). Controlla il calendario gare!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };

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

      updatedTeams = clearedTeams.map(t => {
        const foundGroupName = Object.keys(groups).find(groupKey => groups[groupKey].some(gt => gt.id === t.id));
        if (foundGroupName) {
          return { ...t, group: foundGroupName };
        }
        return t;
      });

      generatedMatches = generateRoundRobinMatches(
        groups,
        startHour,
        matchDuration,
        config.courtCount,
        config.pointsPerSet,
        config.maxSets
      );

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🥇 Torneo "${config.name}" - Fasi Multiple Iniziate!`,
        message: `Fase 1 (Gironi): ${config.groupCount} gironi generati. I migliori qualificati accederanno alla Fase 2 (Tabellone Playoff ad Eliminazione). In bocca al lupo!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'schedule_change',
      };
    }

    try {
      // Write config settings in config settings doc
      await setDoc(doc(db, 'config', 'settings'), cleanObject({
        admittedTeamsCount: config.teamsCount,
        activeTournamentConfig: config
      }));

      // Clear existing matches
      await clearCollection('matches');

      // Write updated teams in DB
      const teamPromises = updatedTeams.map(t => setDoc(doc(db, 'teams', t.id), cleanObject(t)));
      await Promise.all(teamPromises);

      // Write matches in DB
      const matchPromises = generatedMatches.map(m => setDoc(doc(db, 'matches', m.id), cleanObject(m)));
      await Promise.all(matchPromises);

      // Push notification
      await setDoc(doc(db, 'notifications', initNotif.id), cleanObject(initNotif));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tournament_generation');
    }

    // Force focus to bracket/matches viewing tab
    setActiveTab('bracket');
  };

  const handleSubstituteTeam = async (withdrawnTeamId: string, promotedTeamId: string) => {
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

    const swapNotif: NotificationLog = {
      id: `notif-sub-${Date.now()}`,
      title: '🔄 Sostituzione per Ritiro',
      message: `La squadra "${withdrawnTeam.name}" si è ritirata ed è stata sostituita da "${promotedTeam.name}". Il roster e il calendario del torneo sono stati aggiornati!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'schedule_change',
    };

    try {
      await setDoc(doc(db, 'notifications', swapNotif.id), swapNotif);
      if (activeTournamentConfig) {
        await handleGenerateTournament(activeTournamentConfig, updatedTeams);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'team_substitution');
    }
  };

  const handleUpdateMatches = async (newMatches: Match[]) => {
    try {
      if (newMatches.length === 0) {
        await deleteDoc(doc(db, 'config', 'settings'));
        await clearCollection('matches');
      } else {
        const resolved = recalculateTournamentStages(newMatches, teams);
        const promises = resolved.map(m => setDoc(doc(db, 'matches', m.id), cleanObject(m)));
        await Promise.all(promises);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'matches_update');
    }
  };

  // EXPLICIT NOTIFICATION EMITTERS
  const handleAddNotification = async (notification: NotificationLog) => {
    try {
      await setDoc(doc(db, 'notifications', notification.id), notification);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notification.id}`);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await clearCollection('notifications');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications');
    }
  };

  const handleClearAllTournamentData = async () => {
    try {
      await clearCollection('matches');
      await clearCollection('notifications');
      await deleteDoc(doc(db, 'config', 'settings'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'all_tournament_data');
    }
  };

  // Counts of pending notifications or live games to show alert counters
  const activeLiveGamesCount = matches.filter((m) => m.status === 'live').length;

  if (!currentUser) {
    return (
      <div id="auth-gate-root" className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100 text-slate-800 font-sans antialiased flex flex-col items-center justify-center p-4 md:border-8 border-sky-450">
        <motion.div
          id="login-box"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl border-4 border-amber-400 p-8 w-full max-w-sm font-sans space-y-6 relative overflow-hidden"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-amber-50 border-2 border-amber-400 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-sm">
              <Sun className="w-10 h-10 text-orange-500 animate-[spin_30s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic leading-none text-slate-850">
                Beach Volley Hub
              </h2>
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mt-2">
                🏖️ Area Riservata - Accesso Richiesto
              </p>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              L'accesso all'applicazione è limitato agli utenti autorizzati. Inserisci le tue credenziali per visualizzare e gestire i tornei.
            </p>
          </div>

          <form
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              setLoginError(null);
              
              const found = users.find(u => u.username.trim().toLowerCase() === loginUsername.trim().toLowerCase());
              
              if (found && found.password === loginPassword.trim()) {
                setCurrentUser(found);
                setLoginUsername('');
                setLoginPassword('');
              } else {
                setLoginError('Credenziali non corrette o utente non autorizzato.');
              }
            }}
            className="space-y-4 text-slate-800"
          >
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl p-3.5 text-xs font-bold text-center leading-relaxed">
                ⚠️ {loginError}
              </div>
            )}

            <div className="space-y-1 text-left">
              <label htmlFor="login-input-username" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Indirizzo Email / Username</label>
              <input
                id="login-input-username"
                type="email"
                required
                placeholder="esempio@gmail.com"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1 text-left">
              <label htmlFor="login-input-password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password dell'Operatore</label>
              <input
                id="login-input-password"
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-805 text-xs focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-wider py-3.5 rounded-2xl border-b-4 border-emerald-700 transition-all cursor-pointer shadow-md mt-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              Accedi Ora 🚀
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              💡 Credenziali di default dell'Amministratore:<br />
              <strong className="text-slate-500 font-mono">contrera.service@gmail.com</strong><br />
              password: <strong className="text-slate-500 font-mono">admin</strong>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 md:gap-4 bg-sky-600/70 border-2 border-sky-400/50 py-1.5 px-4 md:py-2 md:px-5 rounded-2xl shadow-inner text-[11px] md:text-xs text-white uppercase tracking-wider font-sans">
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

            {/* Authentic Session Administration Widget */}
            <div className="flex items-center">
              {currentUser && (
                <div id="session-user-badge" className="bg-sky-850 border border-sky-400/30 rounded-2xl p-2 px-3 flex items-center gap-3 text-[11px] md:text-xs shadow-inner uppercase tracking-wider font-sans">
                  <div className="text-left">
                    <div className="font-extrabold text-amber-300 max-w-[120px] truncate">{currentUser.username}</div>
                    <div className="text-[8px] text-sky-300 font-black mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {currentUser.role === 'admin' ? '🛡️ Amministratore' : currentUser.role === 'collaborator' ? '💼 Collaboratore' : '👁️ Lettore Spec.'}
                    </div>
                  </div>
                  <button
                    id="btn-logout"
                    onClick={() => {
                      setCurrentUser(null);
                      if (activeTab === 'users' || activeTab === 'archive') {
                        setActiveTab('teams');
                      }
                    }}
                    className="bg-sky-700/80 hover:bg-rose-600 hover:text-white px-2.5 py-1 text-[9px] font-black rounded-xl border border-sky-500/30 transition-all cursor-pointer shrink-0"
                  >
                    Esci 🚪
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Tab Controls Layout */}
        <div className="bg-sky-600/30 border-t border-sky-400/30 py-2.5 md:py-3">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <nav id="app-nav-row" className="flex overflow-x-auto gap-2 md:gap-3 py-1 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                const navItems = [
                  { id: 'teams', label: 'Lista Ingresso', count: teams.length, icon: <Users className="w-3.5 h-3.5" /> },
                  { id: 'bracket', label: 'Gare', count: matches.length, icon: <Award className="w-3.5 h-3.5" /> },
                  { id: 'standings', label: 'Classifiche', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { id: 'notifications', label: 'Notifiche', count: notifications.length, icon: <Bell className="w-3.5 h-3.5" /> }
                ];
                if (currentUser && currentUser.role === 'admin') {
                  navItems.push({ id: 'archive', label: 'Archivio Tornei', count: archives.length, icon: <Trophy className="w-3.5 h-3.5" /> });
                  navItems.push({ id: 'users', label: 'Gestione Utenti', count: users.length, icon: <Shield className="w-3.5 h-3.5" /> });
                }
                return navItems;
              })().map((tab) => {
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
                currentUser={currentUser}
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
                currentUser={currentUser}
                activeTournamentConfig={activeTournamentConfig}
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
              <StandingsTab teams={teams} matches={matches} activeTournamentConfig={activeTournamentConfig} />
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
                currentUser={currentUser}
                notifications={notifications}
                teams={teams}
                onAddNotification={handleAddNotification}
                onClearNotifications={handleClearNotifications}
              />
            </motion.div>
          )}

          {activeTab === 'archive' && currentUser?.role === 'admin' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <ArchiveTab
                currentUser={currentUser}
                archives={archives}
                activeTeams={teams}
                activeMatches={matches}
                activeTournamentConfig={activeTournamentConfig}
                onClearActiveTournament={handleClearAllTournamentData}
              />
            </motion.div>
          )}

          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              <UserTab currentUser={currentUser} users={users} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Ticker */}
      <footer className="mt-12 bg-emerald-500 h-14 flex items-center overflow-hidden whitespace-nowrap shadow-inner border-t-4 border-emerald-600">
        <div className="bg-emerald-700 px-6 h-full flex items-center font-black text-white italic tracking-wider text-xs shrink-0 font-sans">
          PROSSIMI MATCH
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center space-x-12 px-6 text-emerald-50 font-black text-xs uppercase tracking-wider font-sans">
            {(() => {
              const realScheduledMatches = matches.filter(m => 
                m.status === 'scheduled' && 
                m.team1 && 
                m.team2 && 
                m.team1.id !== 't-bye' && 
                m.team2.id !== 't-bye' &&
                !m.team1.name.toLowerCase().includes('bye') && 
                !m.team2.name.toLowerCase().includes('bye') &&
                !m.team1.name.toLowerCase().includes('riposo') && 
                !m.team2.name.toLowerCase().includes('riposo')
              );
              return realScheduledMatches.length > 0 ? (
                realScheduledMatches.map((m, idx) => (
                  <span key={m.id || idx} className="flex items-center gap-1.5 shrink-0">
                    ⏱️ {m.time} - CAMPO {m.court}: {m.team1?.name} VS {m.team2?.name}
                  </span>
                ))
              ) : (
                <span>Nessun match programmato con squadre reali al momento. Genera il tabellone per iniziare la competizione! ☀️</span>
              );
            })()}
          </div>
        </div>
        <div className="hidden md:flex bg-emerald-900 text-emerald-300 text-[10px] uppercase tracking-widest font-black px-4 h-full items-center shrink-0">
          BEACH HUB 2026
        </div>
      </footer>

    </div>
  );
}
