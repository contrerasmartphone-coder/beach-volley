import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Team, Match, AppUser } from '../types';
import { computeFipavStandings, computeTeamStats, sortGroupStandings } from '../utils';
import { Trophy, Award, BarChart3, Medal, ListOrdered, Percent, Sparkles, Check, ChevronDown, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../context/DialogContext';

interface StandingsTabProps {
  teams: Team[];
  matches: Match[];
  activeTournamentConfig?: any;
  currentUser?: AppUser | null;
  admittedTeamsCount?: number | null;
}

export default function StandingsTab({
  teams,
  matches,
  activeTournamentConfig,
  currentUser = null,
  admittedTeamsCount = null,
}: StandingsTabProps) {
  const { alert: customAlert, confirm: customConfirm } = useDialog();
  const [mvpVotes, setMvpVotes] = useState<any[]>([]);
  const [publishedMvp, setPublishedMvp] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [mvpVotingEnabled, setMvpVotingEnabled] = useState<boolean>(false);
  const [isTogglingVoting, setIsTogglingVoting] = useState(false);
  const [isResettingVotes, setIsResettingVotes] = useState(false);

  useEffect(() => {
    const unsubVotes = onSnapshot(collection(db, "mvpVotes"), (snapshot) => {
      const votes: any[] = [];
      snapshot.forEach(doc => {
        votes.push({ id: doc.id, ...doc.data() });
      });
      setMvpVotes(votes);
    });

    const unsubSettings = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPublishedMvp(data.publishedMvp || null);
        setMvpVotingEnabled(data.mvpVotingEnabled || false);
      }
    });

    return () => {
      unsubVotes();
      unsubSettings();
    };
  }, []);

  const isOrganizer = currentUser && (currentUser.role === 'admin' || currentUser.role === 'collaborator');
  const isCombined = activeTournamentConfig?.formula === 'combined';
  const standingsMatches = isCombined ? matches.filter(m => m.phase === 'gironi') : matches;

  const mvpStandings = useMemo(() => {
    const stats: Record<string, { player: string; teamName: string; userVotes: number; matchMvpPoints: number; totalScore: number }> = {};
    
    // Initialize all players
    teams.forEach(t => {
      const isBye = t.name.toLowerCase().includes('bye') || t.name.toLowerCase().includes('riposo');
      if (isBye) return;
      if (t.player1 && t.player1.trim()) {
        const p1 = t.player1.trim();
        stats[p1] = { player: p1, teamName: t.name, userVotes: 0, matchMvpPoints: 0, totalScore: 0 };
      }
      if (t.player2 && t.player2.trim()) {
        const p2 = t.player2.trim();
        stats[p2] = { player: p2, teamName: t.name, userVotes: 0, matchMvpPoints: 0, totalScore: 0 };
      }
    });

    // Add user votes
    mvpVotes.forEach(v => {
      if (v.votedPlayer && stats[v.votedPlayer.trim()]) {
        stats[v.votedPlayer.trim()].userVotes += 1;
      }
    });

    // Add match mvp points
    matches.forEach(m => {
      if (m.status === 'completed' && m.matchMvp) {
        const mvpPlayer = m.matchMvp.trim();
        if (stats[mvpPlayer]) {
          stats[mvpPlayer].matchMvpPoints += 1;
        } else {
          // Fallback if player name is not in teams (e.g. slight spelling change)
          stats[mvpPlayer] = { player: mvpPlayer, teamName: 'N/A', userVotes: 0, matchMvpPoints: 1, totalScore: 1 };
        }
      }
    });

    // Calculate total score and return sorted array
    return Object.values(stats)
      .map(s => ({
        ...s,
        totalScore: s.userVotes + s.matchMvpPoints
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [teams, matches, mvpVotes]);

  const rankedMvpStandings = useMemo(() => {
    let currentRank = 1;
    return mvpStandings.map((s, idx) => {
      if (idx > 0 && s.totalScore < mvpStandings[idx - 1].totalScore) {
        currentRank = idx + 1;
      }
      return {
        ...s,
        rank: currentRank
      };
    });
  }, [mvpStandings]);

  // Separate active teams and withdrawn/substituted teams to avoid mixing them in normal lists
  const activeTeams = teams.filter((t) => !t.isWithdrawn && !t.name.endsWith(' [RITIRATA]'));

  // Admitted and Reserve lists division when tournament behaves with exclusions (use activeTeams only)
  const isLocked = matches.length > 0;
  const limit = admittedTeamsCount !== null ? admittedTeamsCount : (activeTournamentConfig?.teamsCount ?? null);
  const hasExclusions = !!(limit !== null && limit !== undefined && activeTeams.length > limit);

  const chronologicallySorted = [...activeTeams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));

  const reserveTeamIds = React.useMemo(() => {
    return new Set(
      hasExclusions && limit !== null && limit !== undefined
        ? chronologicallySorted.slice(limit).map(t => t.id)
        : []
    );
  }, [hasExclusions, limit, chronologicallySorted]);

  const nonReserveTeams = React.useMemo(() => {
    return teams.filter(t => !reserveTeamIds.has(t.id));
  }, [teams, reserveTeamIds]);

  // Compute stats on-the-fly from historical match results sorted under FIPAV Classifica Avulsa
  const sortedTeams = computeFipavStandings(nonReserveTeams, standingsMatches);

  // Compute group standings on the fly to get pool round ranking positions
  const groupMatches = matches.filter(m => m.phase === 'gironi' || m.groupName);
  const groupsStandings = React.useMemo(() => {
    const computed = computeTeamStats(nonReserveTeams, groupMatches);
    const gr: Record<string, Team[]> = {};
    computed.forEach(t => {
      if (t.group) {
        if (!gr[t.group]) gr[t.group] = [];
        gr[t.group].push(t);
      }
    });
    Object.keys(gr).forEach(gName => {
      const filteredM = groupMatches.filter(m => m.groupName === gName);
      gr[gName] = sortGroupStandings(gr[gName], filteredM);
    });
    return gr;
  }, [teams, groupMatches]);

  const getGroupPlacement = (team: Team) => {
    if (!team.group || !groupsStandings[team.group]) return '-';
    const index = groupsStandings[team.group].findIndex(t => t.id === team.id);
    return index !== -1 ? `${index + 1}° (${team.group.replace('Girone ', '')})` : '-';
  };

  const filteredTeams = sortedTeams;

  // Determine top 3 for the podium based on actual finals results if it's a playoff/bracket tournament
  const grandFinal = matches.find(m => m.roundLabel === 'Finale' && (m.phase === 'eliminazione' || m.id.includes('de') || m.id.startsWith('m-p-')));
  const final3rd = matches.find(m => m.roundLabel === 'Finale 3°/4° Posto');

  const formula = activeTournamentConfig?.formula;
  const isPlayoffTourney = formula && formula !== 'pools';

  const podiumTeams = React.useMemo(() => {
    if (isPlayoffTourney) {
      let first: Team | null = null;
      let second: Team | null = null;
      let third: Team | null = null;

      if (grandFinal && grandFinal.status === 'completed' && grandFinal.winnerId) {
        const winnerId = grandFinal.winnerId;
        const loserId = winnerId === grandFinal.team1?.id ? grandFinal.team2?.id : grandFinal.team1?.id;
        first = teams.find(t => t.id === winnerId) || null;
        second = loserId ? (teams.find(t => t.id === loserId) || null) : null;
      }

      if (final3rd && final3rd.status === 'completed' && final3rd.winnerId) {
        third = teams.find(t => t.id === final3rd.winnerId) || null;
      } else if (formula === 'double_elim') {
        const match10 = matches.find(m => m.id === 'm-de-10');
        if (match10 && match10.status === 'completed') {
          const loserId = match10.winnerId === match10.team1?.id ? match10.team2?.id : match10.team1?.id;
          third = loserId ? (teams.find(t => t.id === loserId) || null) : null;
        }
      }

      // If we have at least 1st or 2nd (meaning the grand final is complete/active), we form the podium
      if (first || second || third) {
        const list: Team[] = [];
        if (first) list.push(first);
        if (second) list.push(second);
        if (third) list.push(third);

        // Fill other slots from sortedTeams that aren't already included
        const remaining = sortedTeams.filter(t => !list.some(lt => lt.id === t.id));
        
        const finalFirst = first || remaining.shift() || sortedTeams[0];
        const finalSecond = second || remaining.shift() || sortedTeams[1];
        const finalThird = third || remaining.shift() || sortedTeams[2];

        return [finalFirst, finalSecond, finalThird].filter(Boolean) as Team[];
      }
    }
    return sortedTeams.slice(0, 3);
  }, [isPlayoffTourney, grandFinal, final3rd, formula, matches, teams, sortedTeams]);

  const topThree = podiumTeams;

  const isTournamentFinished = React.useMemo(() => {
    if (isPlayoffTourney) {
      return !!(grandFinal && grandFinal.status === 'completed');
    }
    return matches.length > 0 && matches.every(m => m.status === 'completed');
  }, [isPlayoffTourney, grandFinal, matches]);

  const getLevelBadgeStyles = (level: Team['level']) => {
    switch (level) {
      case 'Gold': return 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border';
      case 'Silver': return 'bg-slate-55 border-slate-200 text-slate-600 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border';
      case 'Bronze': return 'bg-amber-50 border-amber-600 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border';
      case 'Beginner': return 'bg-emerald-50 border-emerald-250 text-emerald-750 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border';
    }
  };

  return (
    <div id="standings-tab-container" className="space-y-8">
      {/* Visual Podium Header (if we have teams and some wins registered) */}
      {sortedTeams.length > 0 && (sortedTeams.some(t => t.wins > 0) || matches.some(m => m.status === 'completed')) && (
        <div id="podium-section" className="bg-white rounded-3xl border-4 border-orange-300 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-orange-400 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-widest animate-pulse">
            LIVE LEADERBOARD
          </div>
          <h4 className="text-center font-black text-slate-800 text-base tracking-wider uppercase mb-6 flex items-center justify-center gap-1.5 italic">
            <Sparkles className="w-5 h-5 text-orange-500 animate-spin" />
            {isTournamentFinished ? '🏆 Podio Ufficiale del Torneo 🏆' : 'Podio Provvisorio del Torneo'}
          </h4>
          
          <div className="flex justify-center items-end gap-2.5 xs:gap-4 md:gap-10 max-w-lg mx-auto pt-4">
            {/* 2nd Place */}
            {topThree[1] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-10 h-10 xs:w-12 xs:h-12 bg-slate-100 border-2 border-slate-300 rounded-full flex items-center justify-center shadow-md">
                    <Medal className="w-5 h-5 xs:w-6 xs:h-6 text-slate-500" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-slate-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-black shadow-sm">2</span>
                </div>
                <div id="podium-2nd-name" className="text-[10px] xs:text-xs font-black text-slate-800 text-center uppercase tracking-wide break-words max-w-full">{topThree[1].name}</div>
                <div className="w-16 xs:w-24 bg-slate-200 border-t-4 border-slate-300 rounded-t-2xl h-12 xs:h-16 mt-2 flex items-center justify-center text-slate-500 font-black font-mono text-xs xs:text-sm shadow-inner">
                  II
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-14 h-14 xs:w-16 xs:h-16 bg-orange-100 border-2 border-orange-300 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <Trophy className="w-7 h-7 xs:w-8 xs:h-8 text-orange-500" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-black shadow-md">1</span>
                </div>
                <div id="podium-1st-name" className="text-xs xs:text-sm font-black text-orange-850 text-center uppercase tracking-wide break-words max-w-full">{topThree[0].name}</div>
                <div className="w-20 xs:w-28 bg-orange-400 border-t-4 border-orange-600 rounded-t-2xl h-18 xs:h-24 mt-2 flex items-center justify-center text-white font-black font-mono text-base xs:text-xl shadow-md">
                  I
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-col items-center flex-1 min-w-0"
              >
                <div className="relative mb-2">
                  <div className="w-10 h-10 xs:w-12 xs:h-12 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center shadow-md">
                    <Medal className="w-5 h-5 xs:w-6 xs:h-6 text-amber-700" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-black shadow-sm">3</span>
                </div>
                <div id="podium-3rd-name" className="text-[10px] xs:text-xs font-black text-slate-800 text-center uppercase tracking-wide break-words max-w-full">{topThree[2].name}</div>
                <div className="w-16 xs:w-24 bg-amber-100 border-t-4 border-amber-250 rounded-t-2xl h-10 xs:h-12 mt-2 flex items-center justify-center text-amber-700 font-black font-mono text-xs xs:text-sm shadow-inner">
                  III
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Rankings detailed table */}
      <div id="standings-table-container" className="bg-white rounded-3xl shadow-xl border-4 border-sky-200 p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-sky-950 uppercase italic tracking-wide">
              {isCombined ? 'Classifica Avulsa Gironi' : 'Classifica Avulsa'}
            </h3>
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div id="no-standings-placeholder" className="text-center py-12 border border-dashed border-gray-100 rounded-xl">
            <ListOrdered className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Nessuna squadra iscritta</p>
            <p className="text-xs text-gray-400 mt-1">Registra le squadre ed esegui i match del tabellone per vedere la classifica!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-slate-150 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-4 w-16 text-center">Posiz</th>
                    <th className="py-4 px-4">Squadra / Atleti</th>
                    <th className="py-4 px-4 text-center text-rose-600">Piazz. Girone</th>
                    {isOrganizer && <th className="py-4 px-4 text-center">Livello di Gioco</th>}
                    <th className="py-4 px-4 text-center">Gare</th>
                    <th className="py-4 px-4 text-center text-blue-600">Punti Gara</th>
                    <th className="py-4 px-4 text-center text-emerald-600">Vinte</th>
                    <th className="py-4 px-4 text-center text-red-500">Perse</th>
                    <th className="py-4 px-4 text-center text-orange-600">Quoziente Set (V/P)</th>
                    <th className="py-4 px-4 text-center text-amber-600">Q.Pti (V/P)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTeams.map((team, idx) => {
                    const gamesPlayed = team.wins + team.losses;
                    
                    const setRatioString = team.setsLost === 0 && team.setsWon > 0
                      ? `${team.setsWon}.0` 
                      : (team.setsWon / (team.setsLost || 1)).toFixed(2);

                    const pointsRatioString = team.pointsLost === 0 
                      ? '1.00' 
                      : (team.pointsWon / team.pointsLost).toFixed(2);

                    const isPodiumNum = idx < 3;

                    return (
                      <tr
                        key={team.id}
                        id={`standing-row-${team.id}`}
                        className={`transition-colors hover:bg-orange-50/30 ${
                          isPodiumNum ? 'bg-orange-50/10 font-bold' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="py-4.5 px-4 text-center font-black">
                          {isPodiumNum ? (
                            <div className="flex justify-center">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                                idx === 0 ? 'bg-orange-400 text-white border-2 border-orange-500 scale-110' :
                                idx === 1 ? 'bg-slate-200 text-slate-800 border-2 border-slate-300' :
                                'bg-amber-100 text-amber-900 border-2 border-amber-250'
                              }`}>
                                {idx + 1}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-bold text-xs">{idx + 1}</span>
                          )}
                        </td>

                        {/* Team Name / Players */}
                        <td className="py-4.5 px-4">
                          <div id={`standing-name-${team.id}`} className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">{team.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{team.player1} • {team.player2}</div>
                        </td>

                        {/* Piazzamento Girone */}
                        <td className="py-4.5 px-4 text-center font-extrabold text-rose-650 text-sm">
                          {getGroupPlacement(team)}
                        </td>

                        {/* Level Tag */}
                        {isOrganizer && (
                          <td className="py-4.5 px-4 text-center">
                            <span id={`standing-level-${team.id}`} className={`${getLevelBadgeStyles(team.level)}`}>
                              {team.level}
                            </span>
                          </td>
                        )}

                        {/* Played */}
                        <td id={`standing-played-${team.id}`} className="py-4.5 px-4 text-center font-extrabold font-mono text-slate-600 text-sm">
                          {gamesPlayed}
                        </td>

                        {/* Punti Gara */}
                        <td id={`standing-points-${team.id}`} className="py-4.5 px-4 text-center font-black font-mono text-blue-600 text-base">
                          {team.points}
                        </td>

                        {/* Wins */}
                        <td id={`standing-wins-${team.id}`} className="py-4.5 px-4 text-center font-black font-mono text-emerald-600 text-base">
                          {team.wins}
                        </td>

                        {/* Losses */}
                        <td id={`standing-losses-${team.id}`} className="py-4.5 px-4 text-center font-black font-mono text-red-500 text-base">
                          {team.losses}
                        </td>

                        {/* Set ratio */}
                        <td className="py-4.5 px-4 text-center">
                          <div className="font-black font-mono text-orange-500 text-sm">
                            {setRatioString}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono uppercase">
                            {team.setsWon} V / {team.setsLost} P
                          </div>
                        </td>

                        {/* Detailed Points score ratio */}
                        <td className="py-4.5 px-4 text-center">
                          <div className="font-black font-mono text-amber-500 text-sm animate-pulse-inline">
                            {pointsRatioString}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono uppercase">
                            {team.pointsWon} / {team.pointsLost}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden space-y-3">
              {filteredTeams.map((team, idx) => {
                const gamesPlayed = team.wins + team.losses;
                
                const setRatioString = team.setsLost === 0 && team.setsWon > 0
                  ? `${team.setsWon}.0` 
                  : (team.setsWon / (team.setsLost || 1)).toFixed(2);

                const pointsRatioString = team.pointsLost === 0 
                  ? '1.00' 
                  : (team.pointsWon / team.pointsLost).toFixed(2);

                const isPodiumNum = idx < 3;

                return (
                  <div
                    key={team.id}
                    id={`standing-mobile-card-${team.id}`}
                    className={`p-4 rounded-2xl border-2 transition-all bg-slate-50 ${
                      isPodiumNum ? 'border-orange-200 bg-orange-50/5' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPodiumNum ? (
                          <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                            idx === 0 ? 'bg-orange-400 text-white border border-orange-500' :
                            idx === 1 ? 'bg-slate-200 text-slate-850 border border-slate-300' :
                            'bg-amber-100 text-amber-900 border border-amber-250'
                          }`}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="w-5 h-5 shrink-0 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[9px] font-bold">
                            {idx + 1}
                          </span>
                        )}
                        <div className="truncate min-w-0">
                          <div className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wide truncate">{team.name}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{team.player1} • {team.player2}</div>
                          {team.group && (
                            <div className="text-[9px] font-extrabold text-rose-650 uppercase tracking-wider mt-0.5">
                              Piazzamento Girone: {getGroupPlacement(team)}
                            </div>
                          )}
                        </div>
                      </div>
                      {isOrganizer && (
                        <span className={`${getLevelBadgeStyles(team.level)} shrink-0`}>
                          {team.level}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-6 gap-1 text-center mt-3 pt-2.5 border-t border-slate-200/60 text-[9px] font-bold text-slate-500">
                      <div className="bg-slate-100/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Giocate</div>
                        <div className="font-mono font-black text-slate-700 text-xs">{gamesPlayed}</div>
                      </div>
                      <div className="bg-blue-50/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-blue-600 mb-0.5 font-black">Punti</div>
                        <div className="font-mono font-black text-blue-600 text-xs">{team.points}</div>
                      </div>
                      <div className="bg-emerald-50/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-emerald-600/80 mb-0.5 font-black">Vinte</div>
                        <div className="font-mono font-black text-emerald-600 text-xs">{team.wins}</div>
                      </div>
                      <div className="bg-rose-50/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-rose-500/80 mb-0.5 font-black">Perse</div>
                        <div className="font-mono font-black text-rose-500 text-xs">{team.losses}</div>
                      </div>
                      <div className="bg-orange-50/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-orange-600 mb-0.5 font-black">Q.Set</div>
                        <div className="font-mono font-black text-orange-600 text-[10px]">{setRatioString}</div>
                        <div className="text-[7px] text-slate-400 font-mono mt-0.5">{team.setsWon}V/{team.setsLost}P</div>
                      </div>
                      <div className="bg-amber-50/60 p-1 rounded-lg">
                        <div className="text-[8px] uppercase tracking-wider text-amber-600 mb-0.5 font-black">Q.Pti</div>
                        <div className="font-mono font-black text-amber-600 text-[10px]">{pointsRatioString}</div>
                        <div className="text-[7px] text-slate-400 font-mono mt-0.5">{team.pointsWon}/{team.pointsLost}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MVP Section */}
      <div id="mvp-results-section" className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl border-4 border-slate-850 p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
            <div>
              <h3 className="font-black tracking-wider uppercase text-sm font-sans text-amber-300">
                Premiazione MVP del Torneo 🏆
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Somma Voti Community + Miglior Giocatore Gare
              </p>
            </div>
          </div>
          {isOrganizer && (
            <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-amber-400">
              <Lock className="w-3 h-3" /> Console Amministratore
            </span>
          )}
        </div>

        {/* 1. If winner is published, show the beautiful published winner block for everyone */}
        {publishedMvp ? (
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-amber-500/30 space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                🏆 Vincitore Ufficiale MVP 🏆
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight pt-2 drop-shadow-md">
                {publishedMvp.winner}
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                Eletto Miglior Giocatore di questa Edizione
              </p>
            </div>

            {/* Podium details with percentage of votes */}
            {publishedMvp.podium && publishedMvp.podium.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-900">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">
                  Podio Finale MVP (Community + Gare)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {publishedMvp.podium.map((p: any, idx: number) => (
                    <div
                      key={`podium-mvp-${idx}`}
                      className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center space-y-1"
                    >
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                        {p.rank || (idx + 1)}° Classificato
                      </span>
                      <p className="text-xs font-black text-slate-200 truncate uppercase">
                        {p.player}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                          {p.percentage}%
                        </span>
                        <span className="text-[9px] text-slate-500 font-semibold">
                          ({p.votes} {p.votes === 1 ? 'punto' : 'punti'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !isOrganizer && (
            <div className="text-center p-6 text-slate-400 text-xs font-bold bg-slate-950/20 rounded-2xl border border-slate-850">
              <p>Le votazioni sono in corso o in fase di elaborazione!</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-1">
                La classifica ufficiale sarà pubblicata dagli organizzatori al termine del torneo.
              </p>
            </div>
          )
        )}

        {/* 2. Admin Real-time Standings View */}
        {isOrganizer && (
          <div className="space-y-4">
            {/* Controllo Apertura/Chiusura Votazioni */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h5 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Stato Votazioni MVP 🏆
                </h5>
                <p className="text-[10px] text-slate-450 mt-1 flex items-center gap-1.5 font-bold uppercase">
                  {mvpVotingEnabled ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-emerald-400">Votazioni APERTE ed attive per gli utenti</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-rose-400">Votazioni CHIUSE / disattivate</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isTogglingVoting}
                  onClick={async () => {
                    const nextState = !mvpVotingEnabled;
                    const confirmToggle = await customConfirm({
                      title: "Stato Votazioni",
                      message: nextState 
                        ? "Sei sicuro di voler APRIRE le votazioni MVP agli utenti?" 
                        : "Sei sicuro di voler CHIUDERE le votazioni MVP agli utenti?",
                      type: 'confirm'
                    });
                    if (!confirmToggle) return;

                    setIsTogglingVoting(true);
                    try {
                      await setDoc(doc(db, "config", "settings"), {
                        mvpVotingEnabled: nextState
                      }, { merge: true });
                      await customAlert({
                        title: "Successo",
                        message: `Votazioni MVP ${nextState ? 'APERTE 🟢' : 'CHIUSE 🔴'} con successo!`,
                        type: 'success'
                      });
                    } catch (err) {
                      console.error("Errore modifica stato votazioni:", err);
                      await customAlert({
                        title: "Errore",
                        message: "Si è verificato un errore durante la modifica dello stato delle votazioni.",
                        type: 'error'
                      });
                    } finally {
                      setIsTogglingVoting(false);
                    }
                  }}
                  className={`font-black text-[10px] py-2 px-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                    mvpVotingEnabled
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isTogglingVoting ? 'Elaborazione...' : (mvpVotingEnabled ? 'Chiudi Votazioni 🔒' : 'Apri Votazioni 🔓')}
                </button>

                <button
                  type="button"
                  disabled={isResettingVotes || (mvpVotes.length === 0 && !publishedMvp)}
                  onClick={async () => {
                    const confirmReset = await customConfirm({
                      title: "Azzera Votazioni",
                      message: "Sei ASSOLUTAMENTE sicuro di voler AZZERARE TUTTI i voti MVP pervenuti dagli utenti e il podio pubblicato?\nQuesta operazione è irreversibile e consentirà agli utenti di votare nuovamente.",
                      type: 'warning',
                      confirmText: 'Sì, Azzera tutto',
                      cancelText: 'Annulla'
                    });
                    if (!confirmReset) return;

                    setIsResettingVotes(true);
                    try {
                      const q = query(collection(db, "mvpVotes"));
                      const snap = await getDocs(q);
                      const batchPromises = snap.docs.map(docSnap => deleteDoc(doc(db, "mvpVotes", docSnap.id)));
                      await Promise.all(batchPromises);

                      // Also reset/clear the published MVP podium
                      await setDoc(doc(db, "config", "settings"), {
                        publishedMvp: null
                      }, { merge: true });

                      await customAlert({
                        title: "Voti e Podio Azzerati",
                        message: "🧹 Tutti i voti MVP degli utenti e il podio pubblicato sono stati azzerati con successo!",
                        type: 'success'
                      });
                    } catch (err) {
                      console.error("Errore azzeramento voti:", err);
                      await customAlert({
                        title: "Errore",
                        message: "Si è verificato un errore durante l'azzeramento dei voti e del podio.",
                        type: 'error'
                      });
                    } finally {
                      setIsResettingVotes(false);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-[10px] py-2 px-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isResettingVotes ? 'Eliminazione...' : 'Azzera Votazioni'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-amber-500/20 space-y-3.5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    Classifica Voti in Tempo Reale (Privata per Admin)
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Voti totali pervenuti dagli utenti: <strong className="text-white font-mono">{mvpVotes.length}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPublishing || mvpStandings.length === 0}
                    onClick={async () => {
                      if (mvpStandings.length === 0) {
                        await customAlert({
                          title: "Nessun Voto",
                          message: "Nessun atleta ha ancora ricevuto voti.",
                          type: 'info'
                        });
                        return;
                      }
                      
                      const confirmPublish = await customConfirm({
                        title: "Pubblica Vincitore MVP",
                        message: `Vuoi pubblicare ${mvpStandings[0].player} come vincitore MVP del torneo e mostrare a tutti il podio finale?`,
                        type: 'confirm'
                      });
                      if (!confirmPublish) return;

                      setIsPublishing(true);
                      try {
                        const totalWeightedVotes = rankedMvpStandings.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
                        const podium = rankedMvpStandings.filter(s => s.rank <= 3).map(s => {
                          const percentage = totalWeightedVotes > 0 
                            ? Math.round((s.totalScore / totalWeightedVotes) * 100 * 10) / 10 
                            : 0;
                          return {
                            player: s.player,
                            votes: s.totalScore,
                            percentage: percentage,
                            rank: s.rank
                          };
                        });

                        const winners = rankedMvpStandings.filter(s => s.rank === 1).map(s => s.player);
                        const winnerText = winners.length > 0 ? winners.join(' / ') : '';

                        await setDoc(doc(db, "config", "settings"), {
                          publishedMvp: {
                            winner: winnerText,
                            podium: podium,
                            publishedAt: new Date().toISOString()
                          },
                          mvpVotingEnabled: false
                        }, { merge: true });

                        await customAlert({
                          title: "Successo 🎉",
                          message: "Vincitore MVP e Podio pubblicati con successo!",
                          type: 'success'
                        });
                      } catch (err) {
                        console.error("Errore pubblicazione MVP:", err);
                        await customAlert({
                          title: "Errore",
                          message: "Si è verificato un errore durante la pubblicazione.",
                          type: 'error'
                        });
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-black text-[10px] py-2 px-3 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    {isPublishing ? 'Pubblicazione...' : 'Pubblica Vincitore'}
                  </button>
                  {publishedMvp && (
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={async () => {
                        const confirmUnpublish = await customConfirm({
                          title: "Nascondi Pubblicazione",
                          message: "Sei sicuro di voler nascondere la pubblicazione dell'MVP a tutti gli utenti?",
                          type: 'warning'
                        });
                        if (!confirmUnpublish) return;

                        setIsPublishing(true);
                        try {
                          await setDoc(doc(db, "config", "settings"), {
                            publishedMvp: null
                          }, { merge: true });
                          await customAlert({
                            title: "Rimosso",
                            message: "✓ Pubblicazione MVP rimossa con successo.",
                            type: 'success'
                          });
                        } catch (err) {
                          console.error("Errore rimozione pubblicazione MVP:", err);
                          await customAlert({
                            title: "Errore",
                            message: "Si è verificato un errore durante la rimozione della pubblicazione.",
                            type: 'error'
                          });
                        } finally {
                          setIsPublishing(false);
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] py-2 px-3 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      Nascondi
                    </button>
                  )}
                </div>
              </div>

              {rankedMvpStandings.length === 0 ? (
                <p className="text-center py-6 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Nessun voto inserito fino a questo momento
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-900 pr-1 space-y-1">
                  {rankedMvpStandings.map((s, idx) => (
                    <div
                      key={`mvp-row-${s.player}`}
                      className="flex items-center justify-between py-2 text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="font-mono text-[10px] font-black text-slate-500 w-5">
                          #{s.rank}
                        </span>
                        <div className="truncate">
                          <p className="font-black text-slate-200 uppercase truncate">
                            {s.player}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">
                            {s.teamName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-right">
                        <div className="text-[9px] text-slate-400">
                          <span>{s.userVotes}p (utenti)</span>
                          <span className="mx-1">•</span>
                          <span>{s.matchMvpPoints}p (match)</span>
                        </div>
                        <span className="bg-amber-400 text-slate-950 text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-xs">
                          {s.totalScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
