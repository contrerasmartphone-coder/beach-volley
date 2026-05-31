import React, { useState } from 'react';
import { Team, Match } from '../types';
import { computeTeamStats } from '../utils';
import { Trophy, Award, BarChart3, Medal, ListOrdered, Percent, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface StandingsTabProps {
  teams: Team[];
  matches: Match[];
}

export default function StandingsTab({ teams, matches }: StandingsTabProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Compute stats on-the-fly from historical match results
  const computedTeams = computeTeamStats(teams, matches);

  // Sorting:
  // 1st criteria: Victories (Wins) DESC
  // 2nd criteria: Total Ranking Points DESC
  // 3rd criteria: Set Ratio (Sets Won / (Sets Lost || 1)) DESC
  // 4th criteria: Point Quotient (Points Won / (Points Lost || 1)) DESC
  const sortedTeams = [...computedTeams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    
    // Set ratio comparison
    const aSetRatio = a.setsWon / (a.setsLost || 1);
    const bSetRatio = b.setsWon / (b.setsLost || 1);
    if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;

    // Point ratio comparison
    const aPointRatio = a.pointsWon / (a.pointsLost || 1);
    const bPointRatio = b.pointsWon / (b.pointsLost || 1);
    return bPointRatio - aPointRatio;
  });

  const filteredTeams = filterLevel === 'all' 
    ? sortedTeams 
    : sortedTeams.filter(t => t.level === filterLevel);

  // Top 3 for visual podium
  const topThree = sortedTeams.slice(0, 3);

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
      {sortedTeams.length > 0 && sortedTeams.some(t => t.wins > 0) && (
        <div id="podium-section" className="bg-white rounded-3xl border-4 border-orange-300 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-orange-400 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-widest animate-pulse">
            LIVE LEADERBOARD
          </div>
          <h4 className="text-center font-black text-slate-800 text-base tracking-wider uppercase mb-6 flex items-center justify-center gap-1.5 italic">
            <Sparkles className="w-5 h-5 text-orange-500 animate-spin" />
            Podio Provvisorio del Torneo
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
                <div id="podium-2nd-name" className="text-[10px] xs:text-xs font-black text-slate-800 text-center truncate w-16 xs:w-24 uppercase tracking-wide">{topThree[1].name}</div>
                <div id="podium-2nd-stats" className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase">{topThree[1].wins} V - {topThree[1].losses} P</div>
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
                <div id="podium-1st-name" className="text-xs xs:text-sm font-black text-orange-850 text-center truncate w-20 xs:w-28 uppercase tracking-wide">{topThree[0].name}</div>
                <div id="podium-1st-stats" className="text-[10px] xs:text-[11px] text-orange-650 font-black uppercase">{topThree[0].wins} V - {topThree[0].losses} P</div>
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
                <div id="podium-3rd-name" className="text-[10px] xs:text-xs font-black text-slate-800 text-center truncate w-16 xs:w-24 uppercase tracking-wide">{topThree[2].name}</div>
                <div id="podium-3rd-stats" className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase">{topThree[2].wins} V - {topThree[2].losses} P</div>
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
            <h3 className="text-lg font-black text-sky-950 uppercase italic tracking-wide">Classifica Generale</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">I punteggi teorici si calcolano in base ai set conquistati sul campo sabbioso</p>
          </div>
          {/* Level Filter */}
          <div className="flex flex-wrap gap-2 self-start">
            <button
              id="filter-standing-all"
              onClick={() => setFilterLevel('all')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border-b-2 transition-all ${
                filterLevel === 'all' ? 'bg-orange-400 border-orange-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}
            >
              Tutti i livelli
            </button>
            <button
              id="filter-standing-beginner"
              onClick={() => setFilterLevel('Beginner')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border-b-2 transition-all ${
                filterLevel === 'Beginner' ? 'bg-emerald-500 border-emerald-700 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}
            >
              Beginner
            </button>
            <button
              id="filter-standing-bronze"
              onClick={() => setFilterLevel('Bronze')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border-b-2 transition-all ${
                filterLevel === 'Bronze' ? 'bg-amber-700 border-amber-900 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}
            >
              Bronze
            </button>
            <button
              id="filter-standing-silver"
              onClick={() => setFilterLevel('Silver')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border-b-2 transition-all ${
                filterLevel === 'Silver' ? 'bg-slate-400 border-slate-500 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}
            >
              Silver
            </button>
            <button
              id="filter-standing-gold"
              onClick={() => setFilterLevel('Gold')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border-b-2 transition-all ${
                filterLevel === 'Gold' ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}
            >
              Gold
            </button>
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
                    <th className="py-4 px-4 text-center">Livello di Gioco</th>
                    <th className="py-4 px-4 text-center">Gare</th>
                    <th className="py-4 px-4 text-center text-emerald-600">Vinte</th>
                    <th className="py-4 px-4 text-center text-red-500">Perse</th>
                    <th className="py-4 px-4 text-center text-orange-600">Ratio Set (V/P)</th>
                    <th className="py-4 px-4 text-center text-amber-600">Quoz. Punti (V/P)</th>
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

                    const isPodiumNum = idx < 3 && filterLevel === 'all';

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

                        {/* Level Tag */}
                        <td className="py-4.5 px-4 text-center">
                          <span id={`standing-level-${team.id}`} className={`${getLevelBadgeStyles(team.level)}`}>
                            {team.level}
                          </span>
                        </td>

                        {/* Played */}
                        <td id={`standing-played-${team.id}`} className="py-4.5 px-4 text-center font-extrabold font-mono text-slate-600 text-sm">
                          {gamesPlayed}
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

                const isPodiumNum = idx < 3 && filterLevel === 'all';

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
                        </div>
                      </div>
                      <span className={`${getLevelBadgeStyles(team.level)} shrink-0`}>
                        {team.level}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] font-bold text-slate-500">
                      <div className="bg-slate-100/60 p-1.5 rounded-lg">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">Giocate</div>
                        <div className="font-mono font-black text-slate-700 text-sm">{gamesPlayed}</div>
                      </div>
                      <div className="bg-emerald-50/60 p-1.5 rounded-lg">
                        <div className="text-[9px] uppercase tracking-wider text-emerald-600/80 mb-0.5 font-black">Vinte</div>
                        <div className="font-mono font-black text-emerald-600 text-sm">{team.wins}</div>
                      </div>
                      <div className="bg-rose-50/60 p-1.5 rounded-lg">
                        <div className="text-[9px] uppercase tracking-wider text-rose-500/80 mb-0.5 font-black">Perse</div>
                        <div className="font-mono font-black text-rose-500 text-sm">{team.losses}</div>
                      </div>
                      <div className="bg-orange-50/60 p-1.5 rounded-lg">
                        <div className="text-[9px] uppercase tracking-wider text-orange-600 mb-0.5 font-black">Ratio Set</div>
                        <div className="font-mono font-black text-orange-600 text-[11px]">{setRatioString}</div>
                        <div className="text-[7.5px] text-slate-400 font-mono mt-0.5">{team.setsWon}V / {team.setsLost}P</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
