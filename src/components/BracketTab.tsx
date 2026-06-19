import React, { useState, useEffect } from 'react';
import { Team, Match, SetScore, NotificationLog, AppUser } from '../types';
import { simulateCompletedMatch, simulateSetScore, computeGroupStandings, generatePlayoffsFromGroups, computeTeamStats, generateDirectEliminationBracket, generateDoubleEliminationBracket, splitTeamsIntoGroups, generateRoundRobinMatches, autoResolveAndPropagate, isByeTeam, sortTeamsByEntryList, sortGroupStandings, computeFipavStandings, getGaraNumbersMap, parseTimeToMinutes, formatMinutesToTime, printHTML } from '../utils';
import { Calendar, Play, Clock, Save, Edit2, Award, Zap, Shuffle, ListFilter, ArrowRight, Trophy, Sparkles, Check, AlertCircle, Info, RefreshCw, Lock, Printer, FileText, Coffee, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const logoUrl = new URL('../assets/images/wsicily_logo_white_bg_1781554165519.jpg', import.meta.url).href;
const contreraLogoUrl = new URL('../assets/images/regenerated_image_1781554021790.png', import.meta.url).href;

interface BracketTabProps {
  teams: Team[];
  matches: Match[];
  onUpdateMatches: (newMatches: Match[]) => void;
  onGenerateTournament: (config: {
    name: string;
    formula: 'direct' | 'pools' | 'combined' | 'double_elim';
    teamsCount: number;
    groupCount: number;
    courtCount: number;
    pointsPerSet?: 15 | 21;
    maxSets?: 1 | 3;
    sfPointsPerSet?: 15 | 21;
    sfMaxSets?: 1 | 3;
    qualifiedCount?: number;
    include3rd4th?: boolean;
    breakStart?: string;
    breakEnd?: string;
  }) => void;
  onAddNotification: (notification: NotificationLog) => void;
  currentUser?: AppUser | null;
  activeTournamentConfig?: any;
  loadedSaveName?: string | null;
}

export default function BracketTab({
  teams,
  matches,
  onUpdateMatches,
  onGenerateTournament,
  onAddNotification,
  currentUser = null,
  activeTournamentConfig = null,
  loadedSaveName = null,
}: BracketTabProps) {
  const canWrite = currentUser && (currentUser.role === 'admin' || currentUser.role === 'collaborator');
  const isAdmin = currentUser && currentUser.role === 'admin';

  const garaNumbersMap = React.useMemo(() => {
    return getGaraNumbersMap(matches);
  }, [matches]);


  // New Tournament States
  const [tournamentName, setTournamentName] = useState('Classic Beach Cup');
  const [formula, setFormula] = useState<'direct' | 'pools' | 'combined' | 'double_elim'>('combined');
  const [teamsCount, setTeamsCount] = useState<number>(8);
  const [groupCount, setGroupCount] = useState<number>(2);
  const [combinedGroups, setCombinedGroups] = useState<number>(2);
  const [combinedTeamsPerGroup, setCombinedTeamsPerGroup] = useState<number>(4);
  const [combinedQualifiedTeams, setCombinedQualifiedTeams] = useState<number>(4);
  const [courtCount, setCourtCount] = useState<number>(2);
  const [pointsPerSet, setPointsPerSet] = useState<15 | 21>(21);
  const [maxSets, setMaxSets] = useState<1 | 3>(3);
  const [sfPointsPerSet, setSfPointsPerSet] = useState<15 | 21>(21);
  const [sfMaxSets, setSfMaxSets] = useState<1 | 3>(3);
  const [include3rd4th, setInclude3rd4th] = useState<boolean>(true);
  const [breakStart, setBreakStart] = useState<string>('');
  const [breakEnd, setBreakEnd] = useState<string>('');

  // Synchronize teamsCount and groupCount automatically for the 'combined' formula
  useEffect(() => {
    if (formula === 'combined') {
      const calculatedTotal = combinedGroups * combinedTeamsPerGroup;
      setTeamsCount(calculatedTotal);
      setGroupCount(combinedGroups);
    }
  }, [combinedGroups, combinedTeamsPerGroup, formula]);

  // Synchronize tournament name when loading a saved tournament
  useEffect(() => {
    const rawName = loadedSaveName || activeTournamentConfig?.name;
    if (rawName) {
      // Strip out versioning suffixes like " (v2)", " (v3)", etc.
      const cleanedName = rawName.replace(/\s*\(v\d+\)$/gi, '').trim();
      setTournamentName(cleanedName);
    }
  }, [loadedSaveName, activeTournamentConfig?.name]);

  const getRoundName = (q: number) => {
    if (q === 16) return 'Ottavi di finale 🎯';
    if (q === 8) return 'Quarti di finale 🥇';
    if (q === 4) return 'Semifinali 🥈';
    if (q === 2) return 'Finale 🏆';
    return `${q} coppie`;
  };

  const getCombinedQualificationExplanation = (groups: number, teamsPerGroup: number, qualified: number) => {
    const total = groups * teamsPerGroup;
    if (qualified > total) {
      return `⚠️ Attenzione: Il numero di coppie qualificate (${qualified}) non può essere maggiore del totale delle coppie partecipanti (${total}). Riduci le qualificate o aumenta il numero di coppie per girone/gironi.`;
    }
    
    const roundName = getRoundName(qualified);
    
    // Custom smart cases
    if (groups === 3 && qualified === 8) {
      return `🏆 Soluzione ottimale: Le prime 2 di ogni girone (6 coppie in totale) e le 2 migliori terze classificate del torneo (in base alla classifica avulsa) si qualificheranno per i ${roundName}.`;
    }
    if (groups === 3 && qualified === 4) {
      return `🏆 Soluzione ottimale: Le prime classificate di ciascuno dei 3 gironi (3 coppie) e la migliore seconda classificata si qualificheranno per le ${roundName}.`;
    }
    if (groups === 2 && qualified === 4) {
      return `🏆 Soluzione ottimale: Le prime 2 classificate di ciascun girone si qualificheranno direttamente per le ${roundName}.`;
    }
    if (groups === 2 && qualified === 8) {
      return `🏆 Soluzione ottimale: Le prime 4 classificate di ciascun girone si qualificheranno direttamente per i ${roundName}.`;
    }
    if (groups === 4 && qualified === 8) {
      return `🏆 Soluzione ottimale: Le prime 2 classificate di ciascun girone si qualificheranno direttamente per i ${roundName}.`;
    }
    if (groups === 4 && qualified === 4) {
      return `🏆 Soluzione ottimale: Le sole prime classificate di ciascun girone accederanno direttamente alle ${roundName}.`;
    }
    if (groups === 1 && qualified === 2) {
      return `🏆 Soluzione ottimale: Le prime 2 classificate del girone unico si qualificheranno direttamente per la ${roundName}.`;
    }
    if (groups === 1 && qualified === 4) {
      return `🏆 Soluzione ottimale: Le prime 4 classificate del girone unico si qualificheranno per le ${roundName}.`;
    }

    // Fallback programmatic explanation
    const baseQualifiers = Math.floor(qualified / groups);
    const extraQualifiers = qualified % groups;
    if (baseQualifiers > 0) {
      if (extraQualifiers > 0) {
        return `📊 Soluzione: Si qualificheranno le prime ${baseQualifiers} di ciascun girone, più le migliori ${extraQualifiers} ${extraQualifiers === 1 ? 'coppia' : 'coppie'} tra le successive classificate (in base alla classifica avulsa), per un totale di ${qualified} coppie che accederanno ai ${roundName}.`;
      } else {
        return `📊 Soluzione: Si qualificheranno esattamente le prime ${baseQualifiers} di ciascun girone per un totale di ${qualified} coppie che accederanno ai ${roundName}.`;
      }
    } else {
      return `📊 Soluzione: Si qualificheranno le migliori ${qualified} coppie assolute della classifica avulsa per farle accedere ai ${roundName}.`;
    }
  };

  // Active Phase View States
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isPrintExpanded, setIsPrintExpanded] = useState(true);
  const [activePhaseTab, setActivePhaseTab] = useState<'gironi' | 'eliminazione'>('gironi');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('');
  const [groupViewMode, setGroupViewMode] = useState<'by-group' | 'all-list'>('by-group');
  
  // Scoring Dialog Mode
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [t1Set1, setT1Set1] = useState(0);
  const [t2Set1, setT2Set1] = useState(0);
  const [t1Set2, setT1Set2] = useState(0);
  const [t2Set2, setT2Set2] = useState(0);
  const [t1Set3, setT1Set3] = useState(0);
  const [t2Set3, setT2Set3] = useState(0);
  const [editCourt, setEditCourt] = useState('');
  const [editTime, setEditTime] = useState('');
  const [manualT1Sets, setManualT1Sets] = useState(0);
  const [manualT2Sets, setManualT2Sets] = useState(0);
  const [outcomeType, setOutcomeType] = useState<'normal' | 'injury_during' | 'injury_before' | 'forfeit'>('normal');
  const [retiredTeamId, setRetiredTeamId] = useState<string>('');

  const getSetValidationError = (
    s1: number,
    s2: number,
    targetPoints: number,
    isUnplayedAllowed: boolean
  ): string | null => {
    if (s1 === 0 && s2 === 0) {
      if (isUnplayedAllowed) return null;
      return "Questo set deve essere giocato per completare la partita.";
    }

    const max = Math.max(s1, s2);
    const min = Math.min(s1, s2);

    if (s1 === s2) {
      return "I punteggi non possono essere uguali (situazione di parità non ammessa).";
    }

    if (max < targetPoints) {
      return `Punteggio incompleto: una squadra deve raggiungere almeno ${targetPoints} punti (punteggio corrente: ${s1}-${s2}).`;
    }

    const diff = max - min;
    if (diff < 2) {
      return `Scarto insufficiente: ci deve essere una differenza di almeno 2 punti (punteggio corrente: ${s1}-${s2}, differenza: ${diff}).`;
    }

    if (max > targetPoints && diff !== 2) {
      return `Punteggio impossibile: oltre la soglia di ${targetPoints} punti, lo scarto deve essere esattamente di 2 punti (es. ${max}-${max-2}).`;
    }

    return null;
  };

  // Set-level validation errors calculated dynamically of the selected match being edited
  const editingMatchPointsPerSet = editingMatch?.pointsPerSet || 21;
  const editingMatchMaxSets = editingMatch?.maxSets || 3;

  const set1Error = editingMatch 
    ? getSetValidationError(t1Set1, t2Set1, editingMatchPointsPerSet, false) 
    : null;

  const set2Error = editingMatch && editingMatchMaxSets === 3 
    ? getSetValidationError(t1Set2, t2Set2, editingMatchPointsPerSet, false) 
    : null;

  const getSet3Error = () => {
    if (!editingMatch || editingMatchMaxSets !== 3) return null;
    
    // Set 1 is valid if and only if set1Error is null
    const s1Winner = !set1Error ? (t1Set1 > t2Set1 ? 't1' : 't2') : null;
    const s2Winner = !set2Error ? (t1Set2 > t2Set2 ? 't1' : 't2') : null;

    if (s1Winner && s2Winner) {
      if (s1Winner !== s2Winner) {
        // Tied 1-1, Set 3 is required up to 15 points
        return getSetValidationError(t1Set3, t2Set3, 15, false);
      } else {
        // One team won 2-0. No Set 3 should be played.
        if (t1Set3 > 0 || t2Set3 > 0) {
          return "Il Set 3 non deve essere giocato se una squadra ha già vinto 2-0.";
        }
      }
    } else {
      // Set 1 or Set 2 is still not completely valid or entered.
      // If they already started writing in Set 3, validate against 15 points.
      if (t1Set3 > 0 || t2Set3 > 0) {
        return getSetValidationError(t1Set3, t2Set3, 15, false);
      }
    }
    return null;
  };

  const set3Error = getSet3Error();
  const hasAnySetError = !!(set1Error || set2Error || set3Error);

  // Synchronize manual set results with calculated partial scores when they change under FIPAV
  useEffect(() => {
    if (!editingMatch) return;
    const mMaxSets = editingMatch.maxSets || 3;
    const requiredWins = mMaxSets === 1 ? 1 : 2;

    if (outcomeType === 'injury_before' || outcomeType === 'forfeit') {
      if (retiredTeamId === editingMatch.team1?.id) {
        setManualT1Sets(0);
        setManualT2Sets(requiredWins);
      } else if (retiredTeamId === editingMatch.team2?.id) {
        setManualT1Sets(requiredWins);
        setManualT2Sets(0);
      } else {
        setManualT1Sets(0);
        setManualT2Sets(0);
      }
      return;
    }

    let calculatedT1 = 0;
    let calculatedT2 = 0;
    
    if (t1Set1 > 0 || t2Set1 > 0) {
      if (t1Set1 > t2Set1) calculatedT1++;
      else if (t2Set1 > t1Set1) calculatedT2++;
    }
    if (mMaxSets === 3 && (t1Set2 > 0 || t2Set2 > 0)) {
      if (t1Set2 > t2Set2) calculatedT1++;
      else if (t2Set2 > t1Set2) calculatedT2++;
    }
    if (mMaxSets === 3 && (t1Set3 > 0 || t2Set3 > 0)) {
      if (t1Set3 > t2Set3) calculatedT1++;
      else if (t2Set3 > t1Set3) calculatedT2++;
    }

    if (outcomeType === 'injury_during' && retiredTeamId) {
      // Infortunio in corso: retired team retains won sets, winner gets required sets
      if (retiredTeamId === editingMatch.team1?.id) {
        setManualT1Sets(calculatedT1);
        setManualT2Sets(requiredWins);
      } else {
        setManualT1Sets(requiredWins);
        setManualT2Sets(calculatedT2);
      }
    } else {
      setManualT1Sets(calculatedT1);
      setManualT2Sets(calculatedT2);
    }
  }, [t1Set1, t2Set1, t1Set2, t2Set2, t1Set3, t2Set3, editingMatch, outcomeType, retiredTeamId]);

  // Live Simulation state
  const [liveSimulatingMatchId, setLiveSimulatingMatchId] = useState<string | null>(null);
  const [simPointsT1, setSimPointsT1] = useState(0);
  const [simPointsT2, setSimPointsT2] = useState(0);
  const [simCurrentSet, setSimCurrentSet] = useState(1);
  const [simSetsT1, setSimSetsT1] = useState(0);
  const [simSetsT2, setSimSetsT2] = useState(0);
  const [simCompletedSets, setSimCompletedSets] = useState<SetScore[]>([]);
  const [liveTicker, setLiveTicker] = useState('Riscaldamento atleti in corso...');

  // Bracket navigation toggle
  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'visual' | 'cards'>('visual');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<{
    targetMatch: Match;
    conflictingMatch: Match;
    newCourt: string;
    newTime: string;
    isSavingScore: boolean;
    scoreData?: any;
  } | null>(null);

  // Excluded teams (reserves) are strictly the latest ones registered (chronological cutoff)
  const chronologicallySortedForCutoff = [...teams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  const excludedTeamsList = chronologicallySortedForCutoff.slice(teamsCount);

  const renderStandardMatchCard = (match: Match, containerId?: string) => {
    const isLive = match.status === 'live';
    const isCompleted = match.status === 'completed';
    const t1Winner = isCompleted && match.winnerId === match.team1?.id;
    const t2Winner = isCompleted && match.winnerId === match.team2?.id;

    return (
      <div
        key={match.id}
        id={containerId}
        className={`bg-white p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
          isLive
            ? 'border-orange-400 ring-4 ring-orange-50 bg-orange-50/5 shadow-[0_4px_20px_rgba(251,146,60,0.12)]'
            : 'border-slate-150 hover:border-sky-350 hover:shadow-md'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100 mb-3 text-[10px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded text-[10px] uppercase shadow-sm">
                Gara {garaNumbersMap[match.id] || '?'}
              </span>
              <span className={`font-black px-2 py-0.5 rounded uppercase tracking-wider text-[8px] ${
                isCompleted ? 'bg-slate-100 text-slate-500' : (isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-sky-50 text-sky-700 border border-sky-100')
              }`}>
                {isCompleted ? 'Finito' : (isLive ? 'In Corso' : 'Pianificato')}
              </span>
              {match.groupName ? (
                <span className="bg-amber-50 border border-amber-200 text-amber-800 font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase">
                  {match.groupName}
                </span>
              ) : match.roundLabel ? (
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-805 font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase">
                  {match.roundLabel}
                </span>
              ) : null}
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 font-bold shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-500" />
                {match.time || 'N/D'}
              </span>
              <span className="font-extrabold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[9px]">
                {match.court || 'Campo ?'}
              </span>
            </div>
          </div>

          {/* Teams / Competitors */}
          <div className="space-y-3 pb-3">
            {/* Team 1 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t1Winner ? 'bg-orange-500' : 'bg-slate-350'}`} />
                <div className="truncate text-left">
                  <h4 className={`text-xs font-extrabold uppercase truncate ${t1Winner ? 'text-orange-950 underline decoration-orange-400 decoration-2' : 'text-slate-800'}`}>
                    {match.team1 ? match.team1.name : 'TBD'}
                  </h4>
                  {match.team1 && (
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight truncate">
                      {match.team1.player1} / {match.team1.player2}
                    </p>
                  )}
                </div>
              </div>
              <span className={`font-mono text-xs font-black min-w-[28px] text-center px-2 py-1 rounded-md ${isCompleted ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400'} ${t1Winner ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' : ''}`}>
                {isCompleted ? match.team1Score : (isLive ? simPointsT1 : 0)}
              </span>
            </div>

            {/* Team 2 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t2Winner ? 'bg-amber-500' : 'bg-slate-350'}`} />
                <div className="truncate text-left">
                  <h4 className={`text-xs font-extrabold uppercase truncate ${t2Winner ? 'text-orange-950 underline decoration-amber-400 decoration-2' : 'text-slate-800'}`}>
                    {match.team2 ? match.team2.name : 'TBD'}
                  </h4>
                  {match.team2 && (
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight truncate">
                      {match.team2.player1} / {match.team2.player2}
                    </p>
                  )}
                </div>
              </div>
              <span className={`font-mono text-xs font-black min-w-[28px] text-center px-2 py-1 rounded-md ${isCompleted ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400'} ${t2Winner ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' : ''}`}>
                {isCompleted ? match.team2Score : (isLive ? simPointsT2 : 0)}
              </span>
            </div>
          </div>

          {/* Sets partials */}
          {isCompleted && match.sets && match.sets.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 mt-2 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-wide">
              <span>Set parziali:</span>
              <div className="flex gap-1.5 font-mono text-xs">
                {match.sets.map((s, idx) => (
                  <span key={idx} className="bg-white py-0.5 px-2 rounded border border-slate-200 shadow-sm text-slate-800 font-bold">
                    {s.team1}-{s.team2}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isCompleted && match.outcomeType && match.outcomeType !== 'normal' && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 mt-2 flex justify-between items-center text-[9px] font-black uppercase tracking-wide">
              <span className="text-rose-700">Conclusione Gara:</span>
              <span className="bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded leading-none text-[8px] tracking-wider animate-pulse">
                {match.outcomeType === 'forfeit' ? 'ASSENTE / RINUNCIA (2-0)' : match.outcomeType === 'injury_before' ? 'A TAVOLINO (2-0)' : 'INFORTUNIO'}
              </span>
            </div>
          )}

          {/* Live comment/ticker */}
          {isLive && match.livePointTicker && (
            <div className="bg-orange-50 border border-orange-150 rounded-xl p-2.5 mt-2 text-[10px] font-bold italic text-orange-950">
              {match.livePointTicker}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {match.team1 && match.team2 && !isCompleted && !isLive && canWrite && (
          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-100">
            <button
              disabled={!!liveSimulatingMatchId}
              onClick={() => startLiveSimulation(match)}
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-750 text-white font-black py-1.5 px-2 rounded-full text-[10px] uppercase flex items-center justify-center gap-1 disabled:opacity-40 shadow-sm transition-all border-b-2 border-emerald-700 active:translate-y-0.5"
            >
              <Play className="w-3 h-3 fill-white" />
              Live
            </button>
            <button
              onClick={() => openEditModal(match)}
              className="bg-sky-500 hover:bg-sky-600 active:bg-sky-750 text-white font-black py-1.5 px-2 rounded-full text-[10px] uppercase flex items-center justify-center gap-1 shadow-sm transition-all border-b-2 border-sky-700 active:translate-y-0.5"
            >
              <Edit2 className="w-3 h-3" />
              Score
            </button>
            <button
              onClick={() => handleQuickPlayAllMatch(match)}
              className="bg-orange-400 hover:bg-orange-500 active:bg-orange-550 text-white font-black py-1.5 px-2 rounded-full text-[10px] uppercase flex items-center justify-center gap-1 shadow-sm transition-all border-b-2 border-orange-600 active:translate-y-0.5"
            >
              <Zap className="w-3 h-3 text-white" />
              Simula
            </button>
          </div>
        )}

        {match.team1 && match.team2 && isCompleted && !isLive && canWrite && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => openEditModal(match)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-2 px-3 rounded-full text-[10px] uppercase flex items-center justify-center gap-1.5 border border-slate-250 transition-all shadow-sm active:translate-y-0.5"
            >
              <Edit2 className="w-3 h-3 text-slate-600" />
              Modifica Score
            </button>
          </div>
        )}
      </div>
    );
  };

  const getSmartDefaultTeamsCount = (selectedFormula: string) => {
    const registeredCount = teams.length;
    if (selectedFormula === 'double_elim') return 8;
    if (selectedFormula === 'direct') {
      if (registeredCount <= 2) return 2;
      return Math.pow(2, Math.ceil(Math.log2(registeredCount)));
    }
    if (selectedFormula === 'combined') {
      if (registeredCount <= 4) return 4;
      if (registeredCount <= 8) return 8;
      return 16;
    }
    // 'pools'
    if (registeredCount >= 2) return registeredCount;
    return 8;
  };

  const getTeamsCountOptions = () => {
    const registeredCount = teams.length;
    
    if (formula === 'double_elim') {
      const diff = 8 - registeredCount;
      let label = '8 Squadre (Doppia Eliminazione)';
      if (diff > 0) {
        label = `8 Squadre (${diff} BYE inclusi)`;
      } else if (diff < 0) {
        label = `8 Squadre (prime 8 ammesse, ${Math.abs(diff)} escluse)`;
      }
      return [{ value: 8, label }];
    }
    
    if (formula === 'direct') {
      const standardSizes = [2, 4, 8, 16, 32, 64, 128];
      const maxAllowed = Math.pow(2, Math.ceil(Math.log2(Math.max(2, registeredCount))));
      const sizes = standardSizes.filter(size => size <= maxAllowed);
      if (sizes.length === 0) sizes.push(2);
      
      return sizes.map(S => {
        const diff = S - registeredCount;
        let label = `${S} Squadre`;
        if (diff === 0) {
          label += ' (Perfetto - Nessun BYE)';
        } else if (diff > 0) {
          label += ` (${diff} BYE inclusi)`;
        } else {
          label += ` (${Math.abs(diff)} escluse)`;
        }
        return { value: S, label };
      });
    }
    
    if (formula === 'combined') {
      const sizes = [4, 8, 16];
      return sizes.map(S => {
        const diff = S - registeredCount;
        let label = `${S} Squadre`;
        if (diff === 0) {
          label += ' (Perfetto - Nessun BYE)';
        } else if (diff > 0) {
          label += ` (${diff} BYE inclusi)`;
        } else {
          label += ` (${Math.abs(diff)} escluse)`;
        }
        return { value: S, label };
      });
    }
    
    // Formula is 'pools'
    const standardSizes = [4, 6, 8, 12, 16];
    if (registeredCount >= 2 && !standardSizes.includes(registeredCount)) {
      standardSizes.push(registeredCount);
    }
    const sizes = Array.from(new Set(standardSizes)).sort((a, b) => a - b);
    return sizes.map(S => {
      const diff = S - registeredCount;
      let label = `${S} Squadre`;
      if (diff === 0) {
        label += ' (Esatto numero iscritte)';
      } else if (diff > 0) {
        label += ` (${diff} BYE incluse)`;
      } else {
        label += ` (${Math.abs(diff)} escluse)`;
      }
      return { value: S, label };
    });
  };

  useEffect(() => {
    if (matches.length === 0) {
      setTeamsCount(getSmartDefaultTeamsCount(formula));
    }
  }, [teams.length]);

  useEffect(() => {
    if (formula === 'pools') {
      if (teamsCount <= 6) {
        setGroupCount(1);
      } else if (teamsCount > 6 && teamsCount <= 12) {
        if (groupCount !== 1 && groupCount !== 2) {
          setGroupCount(2);
        }
      } else if (teamsCount > 12) {
        if (groupCount !== 2 && groupCount !== 4) {
          setGroupCount(4);
        }
      }
    }
  }, [teamsCount, formula]);

  const getSingleMatchDuration = (pts?: number, sets?: number) => {
    const p = pts || 21;
    const s = sets || 3;
    if (s === 1) {
      if (p === 15) return 15;
      return 20;
    } else {
      if (p === 15) return 45;
      return 50;
    }
  };

  // Stats Calculator
  const getCalculatedStats = (
    currentFormula: 'direct' | 'pools' | 'combined' | 'double_elim',
    currentTeamsCount: number,
    currentGroupCount: number,
    currentCourtCount: number,
    currentPointsPerSet: number,
    currentMaxSets: number,
    currentSfPointsPerSet = sfPointsPerSet,
    currentSfMaxSets = sfMaxSets,
    currentBreakStart = breakStart,
    currentBreakEnd = breakEnd
  ) => {
    const generalMatchDuration = getSingleMatchDuration(currentPointsPerSet, currentMaxSets);
    const sfMatchDuration = getSingleMatchDuration(currentSfPointsPerSet, currentSfMaxSets);
    const hasDifferentSFParams = currentFormula !== 'pools' && (currentMaxSets !== currentSfMaxSets || currentPointsPerSet !== currentSfPointsPerSet);

    let mockMatches: Match[] = [];
    const sortedTeamsTemp = [...teams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    const clearedTeamsTemp = sortedTeamsTemp.map(t => ({
      ...t,
      wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0
    }));

    if (currentFormula === 'direct') {
      mockMatches = generateDirectEliminationBracket(
        clearedTeamsTemp,
        currentTeamsCount,
        '09:00',
        generalMatchDuration,
        currentCourtCount,
        currentPointsPerSet as 15 | 21,
        currentMaxSets as 1 | 3,
        currentSfPointsPerSet as 15 | 21,
        currentSfMaxSets as 1 | 3,
        include3rd4th,
        currentBreakStart,
        currentBreakEnd
      );
    } else if (currentFormula === 'double_elim') {
      mockMatches = generateDoubleEliminationBracket(
        clearedTeamsTemp,
        '09:00',
        generalMatchDuration,
        currentPointsPerSet as 15 | 21,
        currentMaxSets as 1 | 3,
        currentSfPointsPerSet as 15 | 21,
        currentSfMaxSets as 1 | 3,
        currentCourtCount,
        currentBreakStart,
        currentBreakEnd
      );
    } else if (currentFormula === 'pools') {
      const selectedTeams = [...clearedTeamsTemp.slice(0, currentTeamsCount)];
      let byeCount = 1;
      while (selectedTeams.length < currentTeamsCount) {
        selectedTeams.push({
          id: `bye_pool_est_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: 'N/A', player2: 'N/A', level: 'Beginner', registeredAt: '2026-05-27',
          wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0
        } as Team);
      }
      const groups = splitTeamsIntoGroups(selectedTeams, currentGroupCount);
      mockMatches = generateRoundRobinMatches(
        groups,
        '09:00',
        generalMatchDuration,
        currentCourtCount,
        currentPointsPerSet as 15 | 21,
        currentMaxSets as 1 | 3,
        currentBreakStart,
        currentBreakEnd
      );
    } else if (currentFormula === 'combined') {
      const selectedTeams = [...clearedTeamsTemp.slice(0, currentTeamsCount)];
      let byeCount = 1;
      while (selectedTeams.length < currentTeamsCount) {
        selectedTeams.push({
          id: `bye_combined_est_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: 'N/A', player2: 'N/A', level: 'Beginner', registeredAt: '2026-05-27',
          wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0
        } as Team);
      }
      const groups = splitTeamsIntoGroups(selectedTeams, currentGroupCount);
      const groupStageMatches = generateRoundRobinMatches(
        groups,
        '09:00',
        generalMatchDuration,
        currentCourtCount,
        currentPointsPerSet as 15 | 21,
        currentMaxSets as 1 | 3,
        currentBreakStart,
        currentBreakEnd
      );
      mockMatches.push(...groupStageMatches);

      const mockStandings = computeGroupStandings(selectedTeams, groupStageMatches);

      // Dynamically calculate sequential start hour for playoff matches
      let mockPlayoffStartHour = '15:00';
      if (groupStageMatches.length > 0) {
        let latestEndMinutes = 9 * 60; // 09:00
        groupStageMatches.forEach(m => {
          if (m.time && m.time.includes(':')) {
            const matchDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
            const [h, min] = m.time.split(':').map(Number);
            const endMins = h * 60 + min + matchDuration;
            if (endMins > latestEndMinutes) {
              latestEndMinutes = endMins;
            }
          }
        });
        const hStr = String(Math.floor(latestEndMinutes / 60) % 24).padStart(2, '0');
        const mStr = String(latestEndMinutes % 60).padStart(2, '0');
        mockPlayoffStartHour = `${hStr}:${mStr}`;
      }

      const playoffMatches = generatePlayoffsFromGroups(
        mockStandings,
        mockPlayoffStartHour,
        generalMatchDuration,
        currentCourtCount,
        currentPointsPerSet as 15 | 21,
        currentMaxSets as 1 | 3,
        currentSfPointsPerSet as 15 | 21,
        currentSfMaxSets as 1 | 3,
        combinedQualifiedTeams,
        selectedTeams,
        groupStageMatches,
        include3rd4th,
        currentBreakStart,
        currentBreakEnd
      );
      mockMatches.push(...playoffMatches);
    }

    const resolvedMockMatches = autoResolveAndPropagate(mockMatches);

    // Any match that does NOT have a BYE team in either team1 or team2 slot is played
    const realMatches = resolvedMockMatches.filter(m => !isByeTeam(m.team1) && !isByeTeam(m.team2));
    const realMatchesCount = realMatches.length;

    // Total raw playing volume
    const totalRawMinutes = realMatches.reduce((acc, m) => {
      return acc + getSingleMatchDuration(m.pointsPerSet, m.maxSets);
    }, 0);

    let totalElapsedMinutes = 0;

    if (currentFormula === 'pools') {
      const slots = Math.ceil(realMatchesCount / currentCourtCount);
      totalElapsedMinutes = slots * generalMatchDuration;
    } else if (currentFormula === 'direct' || currentFormula === 'double_elim') {
      const roundCounts: Record<number, Match[]> = {};
      realMatches.forEach(m => {
        if (!roundCounts[m.round]) {
          roundCounts[m.round] = [];
        }
        roundCounts[m.round].push(m);
      });
      Object.keys(roundCounts).forEach(roundKey => {
        const roundRealMatches = roundCounts[Number(roundKey)];
        const m = roundRealMatches[0];
        const roundSingleDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const roundSlots = Math.ceil(roundRealMatches.length / currentCourtCount);
        totalElapsedMinutes += roundSlots * roundSingleDuration;
      });
    } else if (currentFormula === 'combined') {
      const groupMatches = realMatches.filter(m => m.phase === 'gironi' || m.id.startsWith('m-1') || !m.phase);
      const groupSlots = Math.ceil(groupMatches.length / currentCourtCount);
      const groupElapsed = groupSlots * generalMatchDuration;

      const playoffMatches = realMatches.filter(m => m.phase === 'eliminazione' || m.id.startsWith('m-p') || m.id.startsWith('m-de'));
      const pRoundCounts: Record<number, Match[]> = {};
      playoffMatches.forEach(m => {
        if (!pRoundCounts[m.round]) {
          pRoundCounts[m.round] = [];
        }
        pRoundCounts[m.round].push(m);
      });
      let playoffElapsed = 0;
      Object.keys(pRoundCounts).forEach(roundKey => {
        const rMatches = pRoundCounts[Number(roundKey)];
        const m = rMatches[0];
        const roundSingleDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const roundSlots = Math.ceil(rMatches.length / currentCourtCount);
        playoffElapsed += roundSlots * roundSingleDuration;
      });

      totalElapsedMinutes = groupElapsed + playoffElapsed;
    }

    let earliestMinutes = 24 * 60;
    let latestEndMinutes = 0;

    realMatches.forEach(m => {
      if (m.time && m.time.includes(':')) {
        const [h, min] = m.time.split(':').map(Number);
        const matchStart = h * 60 + min;
        const matchDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const matchEnd = matchStart + matchDuration;

        if (matchStart < earliestMinutes) earliestMinutes = matchStart;
        if (matchEnd > latestEndMinutes) latestEndMinutes = matchEnd;
      }
    });

    if (realMatchesCount === 0 || latestEndMinutes === 0) {
      earliestMinutes = 9 * 60;
      latestEndMinutes = 9 * 60;
    }

    if (latestEndMinutes > earliestMinutes && latestEndMinutes > 0) {
      totalElapsedMinutes = latestEndMinutes - earliestMinutes;
    }

    const breakStartMins = currentBreakStart ? parseTimeToMinutes(currentBreakStart) : 0;
    const breakEndMins = currentBreakEnd ? parseTimeToMinutes(currentBreakEnd) : 0;
    const hasBreak = !!(currentBreakStart && currentBreakEnd && breakEndMins > breakStartMins);
    const breakDuration = hasBreak ? (breakEndMins - breakStartMins) : 0;

    return {
      realMatchesCount,
      singleMatchDuration: generalMatchDuration,
      sfMatchDuration,
      hasDifferentSFParams,
      totalElapsedMinutes,
      totalRawMinutes,
      earliestMinutes,
      latestEndMinutes,
      breakStart: currentBreakStart || '',
      breakEnd: currentBreakEnd || '',
      hasBreak,
      breakDuration,
      endHour: formatMinutesToTime(latestEndMinutes)
    };
  };

  let resolvedGroupCount = groupCount;
  if (formula === 'combined') {
    resolvedGroupCount = combinedGroups;
  } else if (formula === 'direct' || formula === 'double_elim') {
    resolvedGroupCount = 1;
  }

  const setupStats = getCalculatedStats(
    formula,
    teamsCount,
    resolvedGroupCount,
    courtCount,
    pointsPerSet,
    maxSets,
    sfPointsPerSet,
    sfMaxSets
  );

  // Active stage calculations
  const getActiveTournamentStats = () => {
    if (matches.length === 0) return { realMatchesCount: 0, singleMatchDuration: 0, totalElapsedMinutes: 0, totalRawMinutes: 0 };
    
    const activeFormula = (activeTournamentConfig?.formula && activeTournamentConfig?.formula !== 'N/A')
      ? activeTournamentConfig.formula
      : (matches.some(m => m.phase === 'gironi')
        ? (matches.some(m => m.phase === 'eliminazione' || m.id.startsWith('m-p')) ? 'combined' as const : 'pools' as const)
        : (matches.some(m => m.id.startsWith('m-de')) ? 'double_elim' as const : 'direct' as const));
    
    const activeFirstMatch = matches[0];
    const activePointsPerSet = activeFirstMatch?.pointsPerSet || 21;
    const activeMaxSets = activeFirstMatch?.maxSets || 3;
    const generalMatchDuration = getSingleMatchDuration(activePointsPerSet, activeMaxSets);
    const activeCourtCount = activeTournamentConfig?.courtCount || courtCount;

    const activeBreakStart = activeTournamentConfig?.breakStart || '';
    const activeBreakEnd = activeTournamentConfig?.breakEnd || '';

    let realMatches = matches.filter(m => !isByeTeam(m.team1) && !isByeTeam(m.team2));

    // If combined and playoff matches haven't been generated yet, append mock playoffs!
    if (activeFormula === 'combined') {
      const hasPlayoffs = realMatches.some(m => m.phase === 'eliminazione' || m.id.startsWith('m-p') || m.id.startsWith('m-de'));
      if (!hasPlayoffs) {
        const groupMatches = realMatches.filter(m => m.phase === 'gironi' || m.id.startsWith('m-1') || !m.phase);
        
        const mockStandings = computeGroupStandings(teams, groupMatches);
        
        let mockPlayoffStartHour = '15:00';
        if (groupMatches.length > 0) {
          let latestEndMinutes = 9 * 60; // 09:00
          groupMatches.forEach(m => {
            if (m.time && m.time.includes(':')) {
              const matchDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
              const [h, min] = m.time.split(':').map(Number);
              const endMins = h * 60 + min + matchDuration;
              if (endMins > latestEndMinutes) {
                latestEndMinutes = endMins;
              }
            }
          });
          const hStr = String(Math.floor(latestEndMinutes / 60) % 24).padStart(2, '0');
          const mStr = String(latestEndMinutes % 60).padStart(2, '0');
          mockPlayoffStartHour = `${hStr}:${mStr}`;
        }

        const activeSfPointsPerSet = activeTournamentConfig?.sfPointsPerSet || sfPointsPerSet;
        const activeSfMaxSets = activeTournamentConfig?.sfMaxSets || sfMaxSets;
        const activeQualifiedCount = activeTournamentConfig?.qualifiedCount || combinedQualifiedTeams || 4;
        const activeInclude3rd4th = activeTournamentConfig?.include3rd4th !== undefined 
          ? activeTournamentConfig.include3rd4th 
          : include3rd4th;

        const mockPlayoffs = generatePlayoffsFromGroups(
          mockStandings,
          mockPlayoffStartHour,
          generalMatchDuration,
          activeCourtCount,
          activePointsPerSet as 15 | 21,
          activeMaxSets as 1 | 3,
          activeSfPointsPerSet as 15 | 21,
          activeSfMaxSets as 1 | 3,
          activeQualifiedCount,
          teams,
          groupMatches,
          activeInclude3rd4th,
          activeBreakStart,
          activeBreakEnd
        );

        const realMockPlayoffs = mockPlayoffs.filter(m => !isByeTeam(m.team1) && !isByeTeam(m.team2));
        realMatches = [...realMatches, ...realMockPlayoffs];
      }
    }

    const realMatchesCount = realMatches.length;

    const totalRawMinutes = realMatches.reduce((acc, m) => {
      return acc + getSingleMatchDuration(m.pointsPerSet, m.maxSets);
    }, 0);

    let totalElapsedMinutes = 0;

    if (activeFormula === 'pools') {
      const slots = Math.ceil(realMatchesCount / activeCourtCount);
      totalElapsedMinutes = slots * generalMatchDuration;
    } else if (activeFormula === 'direct' || activeFormula === 'double_elim') {
      const roundCounts: Record<number, Match[]> = {};
      realMatches.forEach(m => {
        if (!roundCounts[m.round]) {
          roundCounts[m.round] = [];
        }
        roundCounts[m.round].push(m);
      });
      Object.keys(roundCounts).forEach(roundKey => {
        const roundRealMatches = roundCounts[Number(roundKey)];
        const m = roundRealMatches[0];
        const roundSingleDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const roundSlots = Math.ceil(roundRealMatches.length / activeCourtCount);
        totalElapsedMinutes += roundSlots * roundSingleDuration;
      });
    } else if (activeFormula === 'combined') {
      const groupMatches = realMatches.filter(m => m.phase === 'gironi' || m.id.startsWith('m-1') || !m.phase);
      const groupSlots = Math.ceil(groupMatches.length / activeCourtCount);
      const groupElapsed = groupSlots * generalMatchDuration;

      const playoffMatches = realMatches.filter(m => m.phase === 'eliminazione' || m.id.startsWith('m-p') || m.id.startsWith('m-de'));
      const pRoundCounts: Record<number, Match[]> = {};
      playoffMatches.forEach(m => {
        if (!pRoundCounts[m.round]) {
          pRoundCounts[m.round] = [];
        }
        pRoundCounts[m.round].push(m);
      });
      let playoffElapsed = 0;
      Object.keys(pRoundCounts).forEach(roundKey => {
        const rMatches = pRoundCounts[Number(roundKey)];
        const m = rMatches[0];
        const roundSingleDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const roundSlots = Math.ceil(rMatches.length / activeCourtCount);
        playoffElapsed += roundSlots * roundSingleDuration;
      });

      totalElapsedMinutes = groupElapsed + playoffElapsed;
    }

    let earliestMinutes = 24 * 60;
    let latestEndMinutes = 0;

    realMatches.forEach(m => {
      if (m.time && m.time.includes(':')) {
        const [h, min] = m.time.split(':').map(Number);
        const matchStart = h * 60 + min;
        const matchDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const matchEnd = matchStart + matchDuration;

        if (matchStart < earliestMinutes) earliestMinutes = matchStart;
        if (matchEnd > latestEndMinutes) latestEndMinutes = matchEnd;
      }
    });

    if (realMatchesCount === 0 || latestEndMinutes === 0) {
      earliestMinutes = 9 * 60;
      latestEndMinutes = 9 * 60;
    }

    if (latestEndMinutes > earliestMinutes && latestEndMinutes > 0) {
      totalElapsedMinutes = latestEndMinutes - earliestMinutes;
    }

    const breakStartMins = activeBreakStart ? parseTimeToMinutes(activeBreakStart) : 0;
    const breakEndMins = activeBreakEnd ? parseTimeToMinutes(activeBreakEnd) : 0;
    const hasBreak = !!(activeBreakStart && activeBreakEnd && breakEndMins > breakStartMins);
    const breakDuration = hasBreak ? (breakEndMins - breakStartMins) : 0;

    return {
      realMatchesCount,
      singleMatchDuration: generalMatchDuration,
      totalElapsedMinutes,
      totalRawMinutes,
      earliestMinutes,
      latestEndMinutes,
      breakStart: activeBreakStart,
      breakEnd: activeBreakEnd,
      hasBreak,
      breakDuration,
      endHour: formatMinutesToTime(latestEndMinutes)
    };
  };

  const activeStats = getActiveTournamentStats();

  const hasActiveMatches = matches.length > 0;
  const activeFirstMatch = matches[0];
  const activeFormula = (activeTournamentConfig?.formula && activeTournamentConfig?.formula !== 'N/A')
    ? activeTournamentConfig.formula
    : (hasActiveMatches 
      ? (matches.some(m => m.phase === 'gironi')
        ? (matches.some(m => m.phase === 'eliminazione' || m.id.startsWith('m-p')) ? 'combined' : 'pools')
        : (matches.some(m => m.id.startsWith('m-de')) ? 'double_elim' : 'direct'))
      : (activeTournamentConfig?.formula || formula || 'combined'));

  const activeTeamsCount = activeTournamentConfig?.teamsCount || teamsCount || teams.length;

  // Determine group count dynamically if we have matches
  let activeGroupCount = 1;
  if (hasActiveMatches) {
    const groups = new Set<string>();
    matches.forEach(m => {
      if (m.phase === 'gironi' && m.groupName) {
        groups.add(m.groupName);
      }
    });
    activeGroupCount = groups.size > 0 ? groups.size : (activeTournamentConfig?.groupCount || groupCount || 1);
  } else {
    activeGroupCount = (activeFormula === 'combined') 
      ? combinedGroups 
      : (activeFormula === 'pools' ? groupCount : 1);
  }

  // Determine court count dynamically if we have matches
  let activeCourtCount = 1;
  if (hasActiveMatches) {
    const courts = new Set<string>();
    matches.forEach(m => {
      if (m.court) {
        courts.add(m.court);
      }
    });
    activeCourtCount = courts.size > 0 ? courts.size : (activeTournamentConfig?.courtCount || courtCount || 1);
  } else {
    activeCourtCount = activeTournamentConfig?.courtCount || courtCount || 1;
  }

  // Determine points and sets format
  const activePointsPerSet = hasActiveMatches 
    ? (activeFirstMatch?.pointsPerSet || 21) 
    : (activeTournamentConfig?.pointsPerSet || pointsPerSet || 21);
  const activeMaxSets = hasActiveMatches 
    ? (activeFirstMatch?.maxSets || 3) 
    : (activeTournamentConfig?.maxSets || maxSets || 3);

  // Determine playoff semifinal/final params
  const activePlayoffFinalMatch = matches.find(m => 
    (m.phase === 'eliminazione' || m.id.startsWith('m-p') || m.id.startsWith('m-de')) && 
    (m.roundLabel?.toLowerCase().includes('finale') || false)
  );
  const activeSfPointsPerSet = activeTournamentConfig?.sfPointsPerSet !== undefined
    ? activeTournamentConfig.sfPointsPerSet
    : (activePlayoffFinalMatch?.pointsPerSet || sfPointsPerSet || 21);
  const activeSfMaxSets = activeTournamentConfig?.sfMaxSets !== undefined
    ? activeTournamentConfig.sfMaxSets
    : (activePlayoffFinalMatch?.maxSets || sfMaxSets || 3);

  const generalMatchDuration = getSingleMatchDuration(activePointsPerSet, activeMaxSets);
  const sfMatchDuration = getSingleMatchDuration(activeSfPointsPerSet, activeSfMaxSets);

  // Determine playoff qualification count
  const activePlayoffMatches = matches.filter(m => m.phase === 'eliminazione' || m.id.startsWith('m-p'));
  let activeQualifiedCount = 4;
  if (hasActiveMatches && activePlayoffMatches.length > 0) {
    const firstPlayoffRound = activePlayoffMatches.reduce((min, m) => m.round < min ? m.round : min, 9999);
    const firstRoundMatches = activePlayoffMatches.filter(m => m.round === firstPlayoffRound);
    activeQualifiedCount = firstRoundMatches.length * 2;
  } else {
    activeQualifiedCount = activeTournamentConfig?.qualifiedCount || combinedQualifiedTeams || 4;
  }

  const activeInclude3rd4th = activeTournamentConfig?.include3rd4th !== undefined 
    ? activeTournamentConfig.include3rd4th 
    : include3rd4th;

  const activeBreakStart = activeTournamentConfig?.breakStart || breakStart || '';
  const activeBreakEnd = activeTournamentConfig?.breakEnd || breakEnd || '';

  let formulaName = '';
  let formulaDescription = '';
  if (activeFormula === 'direct') {
    formulaName = "Eliminazione Diretta 🏆";
    formulaDescription = "Tabellone classico a eliminazione diretta. Chi perde è eliminato, chi vince prosegue il cammino verso la finale.";
  } else if (activeFormula === 'pools') {
    formulaName = "Solo Gironi all'Italiana 🏐";
    formulaDescription = "Campionato lineare con scontri diretti organizzati in gironi (Round Robin). Vince chi accumula più vittorie/punti al termine delle gare.";
  } else if (activeFormula === 'combined') {
    formulaName = "Fasi Multiple: Gironi + Playoff 🥇";
    formulaDescription = "Fase 1 a gironi all'italiana per determinare i piazzamenti. Fase 2 ad eliminazione diretta (Playoff) tra le squadre qualificate.";
  } else if (activeFormula === 'double_elim') {
    formulaName = "Vincenti e Perdenti (Double Elimination) 🔄";
    formulaDescription = "Tabellone a doppia eliminazione. Una squadra viene eliminata solo dopo aver perso 2 incontri, con due tabelloni distinti (Vincenti e Perdenti).";
  }

  const regSetsLabel = activeMaxSets === 1 
    ? `Set Singolo a ${activePointsPerSet} punti` 
    : `2 su 3 a ${activePointsPerSet} (tie break a 15)`;

  const sfSetsLabel = activeSfMaxSets === 1 
    ? `Set Singolo a ${activeSfPointsPerSet} punti` 
    : `2 su 3 a ${activeSfPointsPerSet} (tie break a 15)`;

  const breakText = (activeBreakStart && activeBreakEnd)
    ? `${activeBreakStart} - ${activeBreakEnd}`
    : `Nessuna`;

  // Handle setting up a Match Score manually
  const openEditModal = (match: Match) => {
    if (!canWrite) {
      alert("⚠️ Azione non consentita: effettua l'accesso come collaboratore o amministratore per aggiornare i punteggi.");
      return;
    }
    setEditingMatch(match);
    setEditCourt(match.court);
    setEditTime(match.time);
    setManualT1Sets(match.team1Score || 0);
    setManualT2Sets(match.team2Score || 0);
    setOutcomeType(match.outcomeType || 'normal');
    setRetiredTeamId(match.retiredTeamId || '');
    
    // Set 1
    if (match.sets[0]) {
      setT1Set1(match.sets[0].team1);
      setT2Set1(match.sets[0].team2);
    } else {
      setT1Set1(0); setT2Set1(0);
    }
    // Set 2
    if (match.sets[1]) {
      setT1Set2(match.sets[1].team1);
      setT2Set2(match.sets[1].team2);
    } else {
      setT1Set2(0); setT2Set2(0);
    }
    // Set 3
    if (match.sets[2]) {
      setT1Set3(match.sets[2].team1);
      setT2Set3(match.sets[2].team2);
    } else {
      setT1Set3(0); setT2Set3(0);
    }
  };

  const findSchedulingConflict = (matchId: string, court: string, time: string, pointsPerSet?: number, maxSets?: number) => {
    if (!court || !time) return null;
    
    const startMins = parseTimeToMinutes(time);
    const duration = getSingleMatchDuration(pointsPerSet, maxSets);
    const endMins = startMins + duration;
    
    for (const m of matches) {
      if (m.id === matchId) continue;
      if (m.court === court && m.time) {
        const mStart = parseTimeToMinutes(m.time);
        const mDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
        const mEnd = mStart + mDuration;
        
        // Overlap/Conflict check condition
        if (mStart < endMins && startMins < mEnd) {
          return m; // Return the conflicting match
        }
      }
    }
    return null;
  };

  const resolveConflictWithShift = (targetId: string, newCourt: string, newTime: string, scoreData?: any) => {
    const originalTarget = matches.find(m => m.id === targetId);
    if (!originalTarget) return;

    const updatedTarget: Match = {
      ...originalTarget,
      court: newCourt,
      time: newTime,
      isManuallyScheduled: true,
      ...(scoreData || {}),
    };

    const startMins = parseTimeToMinutes(newTime);
    const duration = getSingleMatchDuration(updatedTarget.pointsPerSet, updatedTarget.maxSets);
    const endMins = startMins + duration;

    let otherMatchesOnCourt = matches.filter(m => m.id !== targetId && m.court === newCourt && m.time);
    
    const unaffected = otherMatchesOnCourt.filter(m => {
      const mStart = parseTimeToMinutes(m.time!);
      const mDur = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
      const mEnd = mStart + mDur;
      return mEnd <= startMins; 
    });

    const affected = otherMatchesOnCourt.filter(m => {
      const mStart = parseTimeToMinutes(m.time!);
      const mDur = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
      const mEnd = mStart + mDur;
      return mEnd > startMins; 
    }).sort((a, b) => parseTimeToMinutes(a.time!) - parseTimeToMinutes(b.time!));

    let nextAvailable = endMins;
    const shiftedMatches = affected.map(m => {
      const mStart = parseTimeToMinutes(m.time!);
      let actualStart = mStart;
      if (mStart < nextAvailable) {
        actualStart = nextAvailable;
      }
      const updatedM: Match = {
        ...m,
        time: formatMinutesToTime(actualStart),
        isManuallyScheduled: true,
      };
      const mDur = getSingleMatchDuration(updatedM.pointsPerSet, updatedM.maxSets);
      nextAvailable = actualStart + mDur;
      return updatedM;
    });

    const shiftedIds = new Set(shiftedMatches.map(m => m.id));
    let finalMatchesList = matches.map(m => {
      if (m.id === targetId) return updatedTarget;
      if (shiftedIds.has(m.id)) {
        return shiftedMatches.find(sm => sm.id === m.id)!;
      }
      return m;
    });

    onUpdateMatches(finalMatchesList);
    setConflictData(null);
    setEditingMatch(null);

    onAddNotification({
      id: `notif-${Date.now()}-shifted`,
      title: 'Slittamento Orari Effettuato ⏰',
      message: `Il conflitto sul ${newCourt} è stato risolto slittando le gare a seguire a partire dalle ${formatMinutesToTime(endMins)}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'live_update',
    });
  };

  const resolveConflictWithInversion = (targetId: string, conflictingId: string, scoreData?: any) => {
    const target = matches.find(m => m.id === targetId);
    const conflicting = matches.find(m => m.id === conflictingId);
    
    if (!target || !conflicting) return;

    const originalTargetCourt = target.court;
    const originalTargetTime = target.time;

    const updatedTarget: Match = {
      ...target,
      court: conflicting.court,
      time: conflicting.time,
      isManuallyScheduled: true,
      ...(scoreData || {}),
    };

    const updatedConflicting: Match = {
      ...conflicting,
      court: originalTargetCourt,
      time: originalTargetTime,
      isManuallyScheduled: true,
    };

    let finalMatchesList = matches.map(m => {
      if (m.id === targetId) return updatedTarget;
      if (m.id === conflictingId) return updatedConflicting;
      return m;
    });

    onUpdateMatches(finalMatchesList);
    setConflictData(null);
    setEditingMatch(null);

    onAddNotification({
      id: `notif-${Date.now()}-inverted`,
      title: 'Inversione Gare Completata 🔄',
      message: `Incontro ${target.team1?.name || '?'} vs ${target.team2?.name || '?'} invertito con ${conflicting.team1?.name || '?'} vs ${conflicting.team2?.name || '?'}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'live_update',
    });
  };

  const handleSaveScheduleOnly = () => {
    if (!editingMatch) return;

    const conflict = findSchedulingConflict(
      editingMatch.id,
      editCourt,
      editTime,
      editingMatch.pointsPerSet,
      editingMatch.maxSets
    );

    if (conflict) {
      setConflictData({
        targetMatch: editingMatch,
        conflictingMatch: conflict,
        newCourt: editCourt,
        newTime: editTime,
        isSavingScore: false,
      });
      return;
    }

    const updatedMatch: Match = {
      ...editingMatch,
      court: editCourt,
      time: editTime,
      isManuallyScheduled: true,
    };

    let updated = matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    onUpdateMatches(updated);

    onAddNotification({
      id: `notif-${Date.now()}-sch`,
      title: 'Cambio Orario/Campo ⏰',
      message: `Ora e campo agg. per ${updatedMatch.team1?.name || '?'} vs ${updatedMatch.team2?.name || '?'}: ${updatedMatch.court || 'Campo ?'} alle ${updatedMatch.time || 'Ora ?'}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'live_update',
      matchId: updatedMatch.id,
    });

    setEditingMatch(null);
  };

  const handlePrintTournamentInfo = () => {
    const hasMatches = matches.length > 0;
    const activeFirstMatch = matches[0];
    const activeFormula = hasMatches 
      ? (matches.some(m => m.phase === 'gironi')
        ? (matches.some(m => m.phase === 'eliminazione' || m.id.startsWith('m-p')) ? 'combined' : 'pools')
        : (matches.some(m => m.id.startsWith('m-de')) ? 'double_elim' : 'direct'))
      : (activeTournamentConfig?.formula || formula || 'combined');

    const activeTeamsCount = activeTournamentConfig?.teamsCount || teamsCount || teams.length;

    // Determine group count dynamically if we have matches
    let activeGroupCount = 1;
    if (hasMatches) {
      const groups = new Set<string>();
      matches.forEach(m => {
        if (m.phase === 'gironi' && m.groupName) {
          groups.add(m.groupName);
        }
      });
      activeGroupCount = groups.size > 0 ? groups.size : (activeTournamentConfig?.groupCount || groupCount || 1);
    } else {
      activeGroupCount = (activeFormula === 'combined') 
        ? combinedGroups 
        : (activeFormula === 'pools' ? groupCount : 1);
    }

    // Determine court count dynamically if we have matches
    let activeCourtCount = 1;
    if (hasMatches) {
      const courts = new Set<string>();
      matches.forEach(m => {
        if (m.court) {
          courts.add(m.court);
        }
      });
      activeCourtCount = courts.size > 0 ? courts.size : (activeTournamentConfig?.courtCount || courtCount || 1);
    } else {
      activeCourtCount = activeTournamentConfig?.courtCount || courtCount || 1;
    }

    // Determine points and sets format
    const activePointsPerSet = hasMatches 
      ? (activeFirstMatch?.pointsPerSet || 21) 
      : (activeTournamentConfig?.pointsPerSet || pointsPerSet || 21);
    const activeMaxSets = hasMatches 
      ? (activeFirstMatch?.maxSets || 3) 
      : (activeTournamentConfig?.maxSets || maxSets || 3);

    // Determine playoff semifinal/final params
    const activePlayoffFinalMatch = matches.find(m => 
      (m.phase === 'eliminazione' || m.id.startsWith('m-p') || m.id.startsWith('m-de')) && 
      (m.roundLabel?.toLowerCase().includes('finale') || false)
    );
    const activeSfPointsPerSet = activeTournamentConfig?.sfPointsPerSet !== undefined
      ? activeTournamentConfig.sfPointsPerSet
      : (activePlayoffFinalMatch?.pointsPerSet || sfPointsPerSet || 21);
    const activeSfMaxSets = activeTournamentConfig?.sfMaxSets !== undefined
      ? activeTournamentConfig.sfMaxSets
      : (activePlayoffFinalMatch?.maxSets || sfMaxSets || 3);

    // Determine playoff qualification count
    const activePlayoffMatches = matches.filter(m => m.phase === 'eliminazione' || m.id.startsWith('m-p'));
    let activeQualifiedCount = 4;
    if (hasMatches && activePlayoffMatches.length > 0) {
      const firstPlayoffRound = activePlayoffMatches.reduce((min, m) => m.round < min ? m.round : min, 9999);
      const firstRoundMatches = activePlayoffMatches.filter(m => m.round === firstPlayoffRound);
      activeQualifiedCount = firstRoundMatches.length * 2;
    } else {
      activeQualifiedCount = activeTournamentConfig?.qualifiedCount || combinedQualifiedTeams || 4;
    }

    const activeInclude3rd4th = activeTournamentConfig?.include3rd4th !== undefined 
      ? activeTournamentConfig.include3rd4th 
      : include3rd4th;

    const activeBreakStart = activeTournamentConfig?.breakStart || breakStart || '';
    const activeBreakEnd = activeTournamentConfig?.breakEnd || breakEnd || '';

    // Get current time estimates based on active/setup stats
    const currentStats = hasMatches ? activeStats : setupStats;

    let formulaName = '';
    let formulaDescription = '';
    if (activeFormula === 'direct') {
      formulaName = "Eliminazione Diretta 🏆";
      formulaDescription = "Tabellone classico a eliminazione diretta. Chi perde è eliminato, chi vince prosegue il cammino verso la finale.";
    } else if (activeFormula === 'pools') {
      formulaName = "Solo Gironi all'Italiana 🏐";
      formulaDescription = "Campionato lineare con scontri diretti organizzati in gironi (Round Robin). Vince chi accumula più vittorie/punti al termine delle gare.";
    } else if (activeFormula === 'combined') {
      formulaName = "Fasi Multiple: Gironi + Playoff 🥇";
      formulaDescription = "Fase 1 a gironi all'italiana per determinare i piazzamenti. Fase 2 ad eliminazione diretta (Playoff) tra le squadre qualificate.";
    } else if (activeFormula === 'double_elim') {
      formulaName = "Vincenti e Perdenti (Double Elimination) 🔄";
      formulaDescription = "Tabellone a doppia eliminazione. Una squadra viene eliminata solo dopo aver perso 2 incontri, con due tabelloni distinti (Vincenti e Perdenti).";
    }

    const regSetsLabel = activeMaxSets === 1 
      ? `Set Singolo a ${activePointsPerSet} punti` 
      : `2 su 3 a ${activePointsPerSet} (tie break a 15)`;

    const sfSetsLabel = activeSfMaxSets === 1 
      ? `Set Singolo a ${activeSfPointsPerSet} punti` 
      : `2 su 3 a ${activeSfPointsPerSet} (tie break a 15)`;

    const breakText = (activeBreakStart && activeBreakEnd)
      ? `Sì &bull; Dalle <strong>${activeBreakStart}</strong> alle <strong>${activeBreakEnd}</strong>`
      : `Nessuna pausa programmata (orari continui)`;

    const playoffQualsHTML = '';

    printHTML(`
      <html>
        <head>
          <title>Scheda Tecnica Torneo - ${tournamentName}</title>
          <style>
            @media print {
              body { padding: 10px; }
              button { display: none; }
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
              padding: 30px; 
              color: #1e293b; 
              line-height: 1.5; 
              background-color: #ffffff;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #f97316; 
              padding-bottom: 12px; 
              margin-bottom: 25px; 
            }
            h1 { 
              margin: 0; 
              color: #0c4a6e; 
              font-size: 24px; 
              text-transform: uppercase; 
              font-weight: 800; 
              letter-spacing: -0.5px; 
            }
            .subtitle { 
              margin: 5px 0 0; 
              color: #f97316; 
              font-size: 14px; 
              font-weight: bold; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
            }
            .meta-info { 
              display: flex; 
              justify-content: space-between; 
              font-size: 10px; 
              color: #64748b; 
              margin-bottom: 25px; 
              font-weight: bold; 
              text-transform: uppercase; 
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .section-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            @media (max-width: 600px) {
              .section-grid {
                grid-template-columns: 1fr;
              }
            }
            .info-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .card-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0c4a6e;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
            }
            .config-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
              font-size: 13px;
            }
            .config-item:last-child {
              border-bottom: none;
            }
            .config-label {
              font-weight: 600;
              color: #475569;
            }
            .config-value {
              font-weight: bold;
              color: #0f172a;
              text-align: right;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 10px; 
              color: #94a3b8; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 15px; 
              text-transform: uppercase; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Wsicily Logo" style="height: 55px; object-fit: contain; max-width: 100%; display: inline-block; referrer-policy: no-referrer;" />
            </div>
            <h1>Scheda Tecnica Torneo</h1>
            <div class="subtitle">${tournamentName}</div>
          </div>
          <div class="meta-info">
            <span>Beach Volley Hub &bull; Documento Tecnico Ufficiale</span>
            <span>Generato il: ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
            <div style="font-weight: 800; text-transform: uppercase; font-size: 11px; color: #b45309; letter-spacing: 0.5px; margin-bottom: 4px;">Formula Generale del Torneo</div>
            <div style="font-size: 16px; font-weight: 800; color: #78350f;">${formulaName}</div>
            <div style="font-size: 13px; color: #92400e; margin-top: 4px; font-weight: 500; line-height: 1.4;">${formulaDescription}</div>
            ${activeFormula === 'combined' ? `
              <div style="font-size: 12px; color: #78350f; font-weight: 600; border-top: 1px solid #fde68a; padding-top: 10px; margin-top: 10px;">
                💡 ${getCombinedQualificationExplanation(activeGroupCount, Math.ceil(activeTeamsCount / activeGroupCount), activeQualifiedCount)}
              </div>
            ` : ''}
          </div>

          <div class="section-grid">
            <!-- Card 1: Formato & Regole -->
            <div class="info-card">
              <div class="card-title">⚡ Formato & Regole</div>
              <div class="config-item">
                <span class="config-label">Incontri Gironi:</span>
                <span class="config-value">${regSetsLabel}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Incontri Finali:</span>
                <span class="config-value">${sfSetsLabel}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Finale 3°/4° Posto:</span>
                <span class="config-value">${activeInclude3rd4th ? 'Disputata 🥉' : 'Non prevista'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Durata Match Standard:</span>
                <span class="config-value">${generalMatchDuration} min</span>
              </div>
              ${activeFormula !== 'pools' ? `
              <div class="config-item">
                <span class="config-label">Durata Match Finali:</span>
                <span class="config-value">${sfMatchDuration} min</span>
              </div>
              ` : ''}
            </div>

            <!-- Card 2: Iscritti & Riserve -->
            <div class="info-card">
              <div class="card-title">👥 Iscritti & Riserve</div>
              <div class="config-item">
                <span class="config-label">Coppie Iscritte:</span>
                <span class="config-value">${teams.length} Coppie</span>
              </div>
              <div class="config-item">
                <span class="config-label">Coppie Ammesse:</span>
                <span class="config-value">${activeTeamsCount} Coppie</span>
              </div>
              <div class="config-item">
                <span class="config-label">Coppie Riserve:</span>
                <span class="config-value">${Math.max(0, teams.length - activeTeamsCount)} ${Math.max(0, teams.length - activeTeamsCount) === 1 ? 'coppia' : 'coppie'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Nome Torneo:</span>
                <span class="config-value">${tournamentName}</span>
              </div>
            </div>

            <!-- Card 3: Gironi & Playoff -->
            <div class="info-card">
              <div class="card-title">🧱 Gironi & Playoff</div>
              <div class="config-item">
                <span class="config-label">Numero Gironi:</span>
                <span class="config-value">${activeFormula === 'pools' || activeFormula === 'combined' ? `${activeGroupCount} ${activeGroupCount === 1 ? 'Girone' : 'Gironi'}` : 'Non previsto'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Coppie per Girone:</span>
                <span class="config-value">${activeFormula === 'pools' || activeFormula === 'combined' ? `${Math.round(activeTeamsCount / activeGroupCount)} coppie` : 'Non applicabile'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Qualificate ai Playoff:</span>
                <span class="config-value">${activeFormula === 'combined' ? `${activeQualifiedCount} coppie` : 'Non previsto'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Campi Attivi Gioco:</span>
                <span class="config-value">${activeCourtCount} ${activeCourtCount === 1 ? 'Campo' : 'Campi'}</span>
              </div>
            </div>

            <!-- Card 4: Tempi, Svolgimento & Fine -->
            <div class="info-card">
              <div class="card-title">🕒 Tempi, Svolgimento & Fine</div>
              <div class="config-item">
                <span class="config-label">Partite Reali:</span>
                <span class="config-value">${currentStats.realMatchesCount} match</span>
              </div>
              <div class="config-item">
                <span class="config-label">Volume di Gioco Totale:</span>
                <span class="config-value">${Math.floor(currentStats.totalRawMinutes / 60)}h ${currentStats.totalRawMinutes % 60}m</span>
              </div>
              <div class="config-item">
                <span class="config-label">Inizio Torneo:</span>
                <span class="config-value">${hasMatches && currentStats.earliestMinutes !== undefined ? formatMinutesToTime(currentStats.earliestMinutes) : '09:00'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Pausa Torneo:</span>
                <span class="config-value">${currentStats.hasBreak ? `☕ ${currentStats.breakStart} - ${currentStats.breakEnd}` : 'Non prevista'}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Durata Stimata Torneo:</span>
                <span class="config-value">${Math.floor(currentStats.totalElapsedMinutes / 60)}h ${currentStats.totalElapsedMinutes % 60}m</span>
              </div>
              <div class="config-item">
                <span class="config-label">Fine Stimata Torneo:</span>
                <span class="config-value">~${currentStats.endHour || 'Finita'}</span>
              </div>
            </div>
          </div>

          <div class="footer" style="margin-top: 45px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div style="margin-bottom: 8px;">
              <img src="${contreraLogoUrl}" alt="Contrera Logo" style="height: 48px; object-fit: contain; margin: 0 auto; display: block; referrer-policy: no-referrer;" />
            </div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold;">
              Beach Volley Hub &bull; Powered by Contrera Smartphone
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
  };

  const handlePrintEntryList = () => {
    const sortedTeams = [...teams].sort((a, b) => {
      const levelOrder = { Gold: 4, Silver: 3, Bronze: 2, Beginner: 1 };
      const levelDiff = (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0);
      if (levelDiff !== 0) return levelDiff;
      return a.name.localeCompare(b.name);
    });

    const rowsHTML = sortedTeams.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 10px; font-weight: bold; font-family: monospace; text-align: center; font-size: 14px; width: 60px;">${idx + 1}</td>
        <td style="padding: 12px 10px; font-weight: bold; color: #1e293b; font-size: 14px;">${t.name}</td>
        <td style="padding: 12px 10px; color: #334155; font-size: 14px;">${t.player1} &amp; ${t.player2}</td>
        <td style="padding: 12px 10px; text-align: center; width: 120px;">
          <span style="
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase;
            background: ${
              t.level === 'Gold' ? '#fef3c7; color: #d97706; border: 1px solid #fde68a;' :
              t.level === 'Silver' ? '#f1f5f9; color: #475569; border: 1px solid #cbd5e1;' :
              t.level === 'Bronze' ? '#ffedd5; color: #c2410c; border: 1px solid #fed7aa;' :
              '#e1fdf4; color: #047857; border: 1px solid #a7f3d0;'
            }
          ">${t.level}</span>
        </td>
        <td style="padding: 12px 10px; width: 180px; text-align: left; font-size: 12px; color: #64748b; font-family: monospace;">
          ${t.phone || '-'}
        </td>
        <td style="padding: 12px 10px; border-left: 1px dashed #cbd5e1; width: 120px; text-align: center; font-size: 11px; color: #94a3b8;">
          [ &nbsp; ] Presente
        </td>
      </tr>
    `).join('');

    printHTML(`
      <html>
        <head>
          <title>Lista di Ingresso - ${tournamentName}</title>
          <style>
            @media print {
              body { padding: 15px; }
              button { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 25px; }
            h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; font-weight: 800; letter-spacing: -0.5px; }
            .subtitle { margin: 5px 0 0; color: #f97316; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; color: #475569; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-transform: uppercase; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Wsicily Logo" style="height: 55px; object-fit: contain; max-width: 100%; display: inline-block; referrer-policy: no-referrer;" />
            </div>
            <h1>Lista d'Ingresso Coppie</h1>
            <div class="subtitle">${tournamentName}</div>
          </div>
          <div class="meta-info">
            <span>Formula: ${activeTournamentConfig?.formula?.toUpperCase() || 'COMBINED'}</span>
            <span>Totale Coppie: ${teams.length} Iscritte</span>
            <span>Data: ${new Date().toLocaleDateString('it-IT')}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Pos / Seed</th>
                <th>Nome Coppia</th>
                <th>Atleti / Componenti</th>
                <th style="text-align: center;">Livello</th>
                <th style="text-align: left;">Contatto</th>
                <th style="text-align: center;">Firma Presenza</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <div class="footer" style="margin-top: 45px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div style="margin-bottom: 8px;">
              <img src="${contreraLogoUrl}" alt="Contrera Logo" style="height: 48px; object-fit: contain; margin: 0 auto; display: block; referrer-policy: no-referrer;" />
            </div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold;">
              Beach Volley Hub &bull; Powered by Contrera Smartphone
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
  };

  const handlePrintGroupsAndPools = () => {
    const gironiMatches = matches.filter(m => m.phase === 'gironi');
    const teamsWithGroup = teams.filter(t => t.group);
    
    if (teamsWithGroup.length === 0 && gironiMatches.length === 0) {
      printHTML(`
        <html>
          <head><title>Fase a Gironi - Errore</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px; color: #333;">
            <h2>Nessuna Fase a Gironi rilevata per il torneo corrente.</h2>
            <p>Assicurati che la formula del torneo includa i gironi (es. "Fase a Gironi" o "Gironi + Playoff") e che i gironi siano generati.</p>
          </body>
        </html>
      `);
      return;
    }

    const distinctGroups = Array.from(new Set(teamsWithGroup.map(t => t.group || ''))).filter(Boolean).sort();
    
    if (distinctGroups.length === 0 && gironiMatches.length > 0) {
      const inferred = Array.from(new Set(gironiMatches.map(m => m.groupName || ''))).filter(Boolean).sort();
      distinctGroups.push(...inferred);
    }

    const sectionsHTML = distinctGroups.map(groupName => {
      const groupTeams = teams.filter(t => t.group === groupName);
      
      const computedStandings = [...groupTeams].sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        const setRatioA = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost;
        const setRatioB = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost;
        if (setRatioB !== setRatioA) return setRatioB - setRatioA;
        return b.wins - a.wins;
      });

      const teamsGroupRows = computedStandings.map((t, index) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 10px; font-weight: bold; text-align: center; color: #64748b; font-size: 13px;">${index + 1}°</td>
          <td style="padding: 8px 10px; font-weight: bold; color: #1e293b; font-size: 13px;">${t.name}</td>
          <td style="padding: 8px 10px; font-size: 12px; color: #475569;">${t.player1} / ${t.player2}</td>
          <td style="padding: 8px 10px; text-align: center; font-weight: bold; font-family: monospace; font-size: 13px;">${t.points || 0}</td>
          <td style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">${t.wins || 0}V - ${t.losses || 0}P</td>
          <td style="padding: 8px 10px; text-align: center; font-size: 12px; color: #64748b;">${t.setsWon || 0}:${t.setsLost || 0}</td>
        </tr>
      `).join('');

      const groupMatches = gironiMatches.filter(m => m.groupName === groupName || m.id.includes(groupName.replace('Girone ', '').toLowerCase()));
      
      const matchesGroupRows = groupMatches.map(m => {
        const garaNum = garaNumbersMap[m.id] ? `Gara #${garaNumbersMap[m.id]}` : `Match`;
        const setsStr = m.sets && m.sets.length > 0 
          ? m.sets.map(s => `${s.team1}-${s.team2}`).join(' / ')
          : '<em>Da giocare</em>';
        const resultStr = m.status === 'completed' 
          ? `<strong style="color: #f97316;">${m.team1Score} - ${m.team2Score}</strong>`
          : '<span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #fef3c7; color: #d97706; font-weight: bold;">DA GIOCARE</span>';
        
        return `
          <tr style="border-bottom: 1px solid #f8fafc;">
            <td style="padding: 10px 8px; font-family: monospace; font-size: 12px; color: #475569; font-weight: bold;">${garaNum}</td>
            <td style="padding: 10px 8px; font-size: 12px; color: #64748b;">${m.time || 'Da definire'}</td>
            <td style="padding: 10px 8px; font-size: 12px; color: #1e293b; font-weight: bold;">${m.court || 'Campo ?'}</td>
            <td style="padding: 10px 8px; font-size: 13px;">
              <span style="${m.status === 'completed' && m.team1Score > m.team2Score ? 'font-weight: bold; color: #0284c7;' : ''}">${m.team1?.name || 'BYE'}</span> 
              <span style="color: #94a3b8; font-weight: normal; margin: 0 4px;">vs</span> 
              <span style="${m.status === 'completed' && m.team2Score > m.team1Score ? 'font-weight: bold; color: #0284c7;' : ''}">${m.team2?.name || 'BYE'}</span>
            </td>
            <td style="padding: 10px 8px; text-align: center; font-size: 13px;">${resultStr}</td>
            <td style="padding: 10px 8px; font-size: 12px; color: #64748b; font-family: monospace; text-align: center;">${setsStr}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 40px; border: 2px solid #e2e8f0; border-radius: 20px; padding: 20px; background: #fff;">
          <h2 style="margin-top: 0; color: #f97316; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 8px; text-transform: uppercase; font-weight: 800; display: flex; justify-content: space-between;">
            <span>📋 ${groupName}</span>
            <span style="font-size: 11px; background: #ffedd5; color: #ea580c; padding: 3px 10px; border-radius: 9999px; font-weight: bold;">Fase a Gironi</span>
          </h2>
          
          <h3 style="font-size: 12px; font-weight: 850; text-transform: uppercase; tracking: 0.5px; color: #475569; margin: 15px 0 8px 0;">Classifica Corrente</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                <th style="width: 10%; text-align: center; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Pos</th>
                <th style="width: 30%; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Coppia</th>
                <th style="width: 30%; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Giocatori</th>
                <th style="width: 10%; text-align: center; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Punti</th>
                <th style="width: 10%; text-align: center; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">V / P</th>
                <th style="width: 10%; text-align: center; padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Set V:P</th>
              </tr>
            </thead>
            <tbody>
              ${teamsGroupRows || '<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94a3b8;">Nessuna coppia iscritta in questo girone</td></tr>'}
            </tbody>
          </table>

          <h3 style="font-size: 12px; font-weight: 850; text-transform: uppercase; tracking: 0.5px; color: #475569; margin: 20px 0 8px 0;">Programma Incontri del Girone</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                <th style="width: 15%; padding: 8px; font-size: 10px; text-transform: uppercase;">Gara</th>
                <th style="width: 15%; padding: 8px; font-size: 10px; text-transform: uppercase;">Orario</th>
                <th style="width: 15%; padding: 8px; font-size: 10px; text-transform: uppercase;">Campo</th>
                <th style="width: 30%; padding: 8px; font-size: 10px; text-transform: uppercase;">Incontro</th>
                <th style="width: 10%; text-align: center; padding: 8px; font-size: 10px; text-transform: uppercase;">Risultato</th>
                <th style="width: 15%; text-align: center; padding: 8px; font-size: 10px; text-transform: uppercase;">Parziali Set</th>
              </tr>
            </thead>
            <tbody>
              ${matchesGroupRows || '<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94a3b8;">Nessun incontro programmato per questo girone</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    printHTML(`
      <html>
        <head>
          <title>Composizione e Gare Gironi - ${tournamentName}</title>
          <style>
            @media print {
              body { padding: 15px; background: transparent; }
              button { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 35px; color: #1e293b; background: #f8fafc; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 25px; background: #fff; border-radius: 12px; padding: 15px; }
            h1 { margin: 0; color: #0f172a; font-size: 22px; text-transform: uppercase; font-weight: 800; }
            .subtitle { margin: 5px 0 0; color: #f97316; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 20px; font-weight: bold; padding: 0 10px; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Wsicily Logo" style="height: 55px; object-fit: contain; max-width: 100%; display: inline-block; referrer-policy: no-referrer;" />
            </div>
            <h1>Composizione Gironi e Programma Gare</h1>
            <div class="subtitle">${tournamentName}</div>
          </div>
          <div class="meta-info">
            <span>Stato: Fase a Gironi in corso</span>
            <span>Gironi totali: ${distinctGroups.length}</span>
            <span>Data Report: ${new Date().toLocaleDateString('it-IT')}</span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${sectionsHTML}
          </div>

          <div class="footer" style="margin-top: 45px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div style="margin-bottom: 8px;">
              <img src="${contreraLogoUrl}" alt="Contrera Logo" style="height: 48px; object-fit: contain; margin: 0 auto; display: block; referrer-policy: no-referrer;" />
            </div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold;">
              Beach Volley Hub &bull; Powered by Contrera Smartphone
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
  };

  const handlePrintOrderedMatches = () => {
    const sortedMatches = [...matches].sort((a, b) => {
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      
      const courtA = a.court || '';
      const courtB = b.court || '';
      if (courtA !== courtB) return courtA.localeCompare(courtB);
      
      const numA = garaNumbersMap[a.id] || 999999;
      const numB = garaNumbersMap[b.id] || 999999;
      return numA - numB;
    });

    const rowsHTML = sortedMatches.map(m => {
      let phaseLabel = m.phase === 'gironi' ? 'Gironi' : 'Playoff';
      if (m.roundLabel) {
        phaseLabel += ` - ${m.roundLabel}`;
      } else if (m.groupName) {
        phaseLabel += ` - ${m.groupName}`;
      }

      const t1Name = m.team1 ? m.team1.name : 'TBD';
      const t2Name = m.team2 ? m.team2.name : 'TBD';

      let resultString = '-';
      let setsDetails = '-';
      if (m.status === 'completed') {
        resultString = `<span style="font-weight: bold; color: #ea580c;">${m.team1Score} - ${m.team2Score}</span>`;
        if (m.sets && m.sets.length > 0) {
          setsDetails = m.sets.map(s => `${s.team1}-${s.team2}`).join(' / ');
        }
      } else if (m.status === 'live') {
        resultString = '<span style="font-weight: bold; background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-size: 11px;">LIVE</span>';
      } else {
        resultString = '<span style="font-weight: bold; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 11px;">PROGRAMMATO</span>';
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; height: 45px;">
          <td style="padding: 10px; font-weight: 900; font-family: monospace; font-size: 15px; text-align: center; background: #eff6ff; color: #1d4ed8; border-right: 1px solid #cbd5e1;">${m.time || '--:--'}</td>
          <td style="padding: 10px; font-weight: 800; font-size: 13px; text-align: center; color: #059669;">${m.court || 'Campo ?'}</td>
          <td style="padding: 10px; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b;">${phaseLabel}</td>
          <td style="padding: 10px; font-size: 14px;">
            <span style="${m.status === 'completed' && m.team1Score > m.team2Score ? 'font-weight: bold; color: #0f172a;' : 'color: #334155;'}">${t1Name}</span>
            <span style="color: #94a3b8; font-weight: normal; margin: 0 5px;">vs</span>
            <span style="${m.status === 'completed' && m.team2Score > m.team1Score ? 'font-weight: bold; color: #0f172a;' : 'color: #334155;'}">${t2Name}</span>
          </td>
          <td style="padding: 10px; text-align: center; font-size: 14px;">${resultString}</td>
          <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #475569; text-align: center;">${setsDetails}</td>
        </tr>
      `;
    }).join('');

    printHTML(`
      <html>
        <head>
          <title>Elenco Ordinato Gare - ${tournamentName}</title>
          <style>
            @media print {
              body { padding: 15px; }
              button { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 25px; }
            h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; font-weight: 800; }
            .subtitle { margin: 5px 0 0; color: #f97316; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; color: #475569; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-transform: uppercase; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Wsicily Logo" style="height: 55px; object-fit: contain; max-width: 100%; display: inline-block; referrer-policy: no-referrer;" />
            </div>
            <h1>Programma Completo ed Elenco Ordinato Gare</h1>
            <div class="subtitle">${tournamentName}</div>
          </div>
          <div class="meta-info">
            <span>Formula: ${activeTournamentConfig?.formula?.toUpperCase() || 'COMBINED'}</span>
            <span>Totale Gare: ${matches.length} Partite</span>
            <span>Data Report: ${new Date().toLocaleDateString('it-IT')}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 100px; background: #eff6ff; color: #1e40af; border-bottom: 2px solid #3b82f6;">Orario</th>
                <th style="text-align: center; width: 100px;">Campo</th>
                <th style="width: 150px;">Fase / Gruppo</th>
                <th>Incontro</th>
                <th style="text-align: center; width: 100px;">Risultato Sets</th>
                <th style="text-align: center; width: 150px;">Parziali Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <div class="footer" style="margin-top: 45px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <div style="margin-bottom: 8px;">
              <img src="${contreraLogoUrl}" alt="Contrera Logo" style="height: 48px; object-fit: contain; margin: 0 auto; display: block; referrer-policy: no-referrer;" />
            </div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold;">
              Beach Volley Hub &bull; Powered by Contrera Smartphone
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
  };

  const handleSaveScoreManual = () => {
    if (!editingMatch || !editingMatch.team1 || !editingMatch.team2) return;

    if (outcomeType === 'normal' && hasAnySetError) {
      alert(`⚠️ Errore di compilazione: correggi i punteggi errati dei set prima di procedere.\n\n` + 
        [set1Error && `• Set 1: ${set1Error}`, set2Error && `• Set 2: ${set2Error}`, set3Error && `• Set 3: ${set3Error}`]
          .filter(Boolean)
          .join('\n')
      );
      return;
    }

    let sets: SetScore[] = [];
    const mMaxSets = editingMatch.maxSets || 3;
    const requiredWins = mMaxSets === 1 ? 1 : 2;

    if (outcomeType !== 'injury_before' && outcomeType !== 'forfeit') {
      // Validate Set 1
      if (t1Set1 > 0 || t2Set1 > 0) {
        sets.push({ team1: t1Set1, team2: t2Set1 });
      }
      // Validate Set 2 (only for maxSets === 3)
      if (mMaxSets === 3 && (t1Set2 > 0 || t2Set2 > 0)) {
        sets.push({ team1: t1Set2, team2: t2Set2 });
      }
      // Validate Set 3 (only for maxSets === 3)
      if (mMaxSets === 3 && (t1Set3 > 0 || t2Set3 > 0)) {
        sets.push({ team1: t1Set3, team2: t2Set3 });
      }
    } else if (outcomeType === 'forfeit') {
      const winnerIsTeam1 = (retiredTeamId === editingMatch.team2?.id);
      const pPerSet = editingMatch.pointsPerSet || 21;
      
      if (pPerSet === 15) {
        if (mMaxSets === 1) {
          sets = [{
            team1: winnerIsTeam1 ? 15 : 9,
            team2: winnerIsTeam1 ? 9 : 15
          }];
        } else {
          sets = [
            { team1: winnerIsTeam1 ? 15 : 12, team2: winnerIsTeam1 ? 12 : 15 },
            { team1: winnerIsTeam1 ? 15 : 12, team2: winnerIsTeam1 ? 12 : 15 }
          ];
        }
      } else { // 21 points
        if (mMaxSets === 1) {
          sets = [{
            team1: winnerIsTeam1 ? 21 : 15,
            team2: winnerIsTeam1 ? 15 : 21
          }];
        } else {
          sets = [
            { team1: winnerIsTeam1 ? 21 : 18, team2: winnerIsTeam1 ? 18 : 21 },
            { team1: winnerIsTeam1 ? 21 : 18, team2: winnerIsTeam1 ? 18 : 21 }
          ];
        }
      }
    }

    // Determine target finished state based on verified manualT1Sets and manualT2Sets
    const isFinished = manualT1Sets >= requiredWins || manualT2Sets >= requiredWins || (mMaxSets === 1 && (manualT1Sets > 0 || manualT2Sets > 0)) || (outcomeType !== 'normal' && retiredTeamId !== '');
    let winnerId = undefined;
    if (isFinished) {
      if (outcomeType !== 'normal' && retiredTeamId !== '') {
        winnerId = retiredTeamId === editingMatch.team1.id ? editingMatch.team2.id : editingMatch.team1.id;
      } else {
        if (manualT1Sets > manualT2Sets) {
          winnerId = editingMatch.team1.id;
        } else if (manualT2Sets > manualT1Sets) {
          winnerId = editingMatch.team2.id;
        }
      }
    }

    const scoreData = {
      sets,
      team1Score: manualT1Sets,
      team2Score: manualT2Sets,
      status: isFinished ? ('completed' as const) : editingMatch.status,
      winnerId,
      outcomeType,
      retiredTeamId: outcomeType !== 'normal' ? retiredTeamId : undefined,
      isManuallyScheduled: true,
    };

    const conflict = findSchedulingConflict(
      editingMatch.id,
      editCourt,
      editTime,
      editingMatch.pointsPerSet,
      editingMatch.maxSets
    );

    if (conflict) {
      setConflictData({
        targetMatch: editingMatch,
        conflictingMatch: conflict,
        newCourt: editCourt,
        newTime: editTime,
        isSavingScore: true,
        scoreData,
      });
      return;
    }

    const updatedMatch: Match = {
      ...editingMatch,
      court: editCourt,
      time: editTime,
      ...scoreData,
    };

    propagateWinner(updatedMatch);
    setEditingMatch(null);
  };

  // Helper to push winners (and losers if applicable) to future bracket matches
  const propagateWinner = (completedMatch: Match) => {
    let updated = matches.map(m => m.id === completedMatch.id ? completedMatch : m);

    if (completedMatch.winnerId && completedMatch.nextMatchId) {
      const winnerTeam = completedMatch.winnerId === completedMatch.team1?.id ? completedMatch.team1 : completedMatch.team2;
      const targetMatchIndex = updated.findIndex(m => m.id === completedMatch.nextMatchId);

      if (targetMatchIndex !== -1 && winnerTeam) {
        const targetMatch = { ...updated[targetMatchIndex] };
        if (completedMatch.nextMatchSlot === 'team1') {
          targetMatch.team1 = winnerTeam;
        } else {
          targetMatch.team2 = winnerTeam;
        }
        updated[targetMatchIndex] = targetMatch;

        // Custom notification trigger for bracket progress
        onAddNotification({
          id: `notif-${Date.now()}-prop`,
          title: 'Avanzamento Tabellone 🏆',
          message: `I vincitori "${winnerTeam.name}" passano al turno successivo (${completedMatch.roundLabel} ➔ ${targetMatch.roundLabel})!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'live_update',
          matchId: targetMatch.id,
        });
      }
    }

    if (completedMatch.winnerId && completedMatch.loserMatchId) {
      const loserTeam = completedMatch.winnerId === completedMatch.team1?.id ? completedMatch.team2 : completedMatch.team1;
      const targetMatchIndex = updated.findIndex(m => m.id === completedMatch.loserMatchId);

      if (targetMatchIndex !== -1 && loserTeam) {
        const targetMatch = { ...updated[targetMatchIndex] };
        if (completedMatch.loserMatchSlot === 'team1') {
          targetMatch.team1 = loserTeam;
        } else {
          targetMatch.team2 = loserTeam;
        }
        updated[targetMatchIndex] = targetMatch;

        // Custom notification trigger for loser bracket progress
        onAddNotification({
          id: `notif-${Date.now()}-prop-loser`,
          title: 'Tabellone Perdenti 🔄',
          message: `La squadra "${loserTeam.name}" scende nel tabellone dei perdenti (${completedMatch.roundLabel} ➔ ${targetMatch.roundLabel}) per giocarsi l'accesso in semifinale.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'live_update',
          matchId: targetMatch.id,
        });
      }
    }

    // Trigger general notification for match completed
    if (completedMatch.status === 'completed' && completedMatch.winnerId) {
      const winnerTeam = completedMatch.winnerId === completedMatch.team1?.id ? completedMatch.team1 : completedMatch.team2;
      const scoresString = completedMatch.sets.map(s => `${s.team1}-${s.team2}`).join(', ');
      
      onAddNotification({
        id: `notif-${Date.now()}-res`,
        title: `Risultato Finale: ${completedMatch.team1?.name} vs ${completedMatch.team2?.name}`,
        message: `Vince ${winnerTeam?.name} per ${completedMatch.team1Score} a ${completedMatch.team2Score} (${scoresString}) sul ${completedMatch.court}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'result',
        matchId: completedMatch.id,
      });
    }

    onUpdateMatches(updated);
  };

  // Fully Automated Quick Seed
  const handleQuickPlayAllMatch = (match: Match) => {
    if (!canWrite) {
      alert("⚠️ Azione non consentita: effettua l'accesso come collaboratore o amministratore per simulare i match.");
      return;
    }
    if (!match.team1 || !match.team2) return;
    const resolved = simulateCompletedMatch(match);
    propagateWinner(resolved);
  };

  // Live Match Play-By-Play Simulation Engine
  const getVolleyCommentary = (t1: string, t2: string, sc1: number, sc2: number) => {
    const comments = [
      `Battuta potente di ${t1}... grandiosa ricezione di ${t2}!`,
      `Incredibile muro di ${t1} a fermare l'attacco avversario!`,
      `Schiacciata potente sulla linea laterale per ${t1}! Punto!`,
      `Ace al servizio per ${t1}! Spettacolo sulla sabbia!`,
      `Ersis difende di piede! ${t2} non riesce a rimandare la palla di là.`,
      `Errore in battuta per ${t2}, pallone a rete.`,
      `Doppio tocco fischiato a ${t2}. Giro palla.`,
      `Pallonetto astuto di ${t1} che scavalca il muro avversario!`,
      `Scambio lunghissimo sulla spiaggia! Tutti e quattro i giocatori stremati, alla fine la spunta ${t1}!`,
      `Servizio corto che inganna la difesa di ${t2}. Punto diretto!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  };

  const startLiveSimulation = (match: Match) => {
    if (!canWrite) {
      alert("⚠️ Azione non consentita: effettua l'accesso come collaboratore o amministratore per avviare il live ticker.");
      return;
    }
    if (!match.team1 || !match.team2 || liveSimulatingMatchId) return;

    setLiveSimulatingMatchId(match.id);
    setSimPointsT1(0);
    setSimPointsT2(0);
    setSimCurrentSet(1);
    setSimSetsT1(0);
    setSimSetsT2(0);
    setSimCompletedSets([]);
    setLiveTicker(`Riscaldamento completato per ${match.team1.name} e ${match.team2.name}. Il match sta per iniziare! 🏐`);

    // Force match status to live
    const ongoingMatch: Match = {
      ...match,
      status: 'live',
      livePointTicker: 'Match Iniziato!'
    };
    onUpdateMatches(matches.map(m => m.id === match.id ? ongoingMatch : m));

    onAddNotification({
      id: `notif-${Date.now()}-live-start`,
      title: '🚨 MATCH LIVE IN CORSO!',
      message: `${match.team1.name} vs ${match.team2.name} è iniziato sul ${match.court}. Segui in diretta!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'live_update',
      matchId: match.id,
    });
  };

  // Effect to drive point-by-point simulation ticker
  useEffect(() => {
    if (!liveSimulatingMatchId) return;

    const matchObj = matches.find(m => m.id === liveSimulatingMatchId);
    if (!matchObj || !matchObj.team1 || !matchObj.team2) return;

    const t1Name = matchObj.team1.name;
    const t2Name = matchObj.team2.name;

    const interval = setInterval(() => {
      // Determine set point thresholds based on FIPAV Beach Volley standard
      const isTieBreak = simCurrentSet === 3;
      const targetPoints = isTieBreak ? 15 : 21;

      // Random point winner based on small random bias
      const t1WinsPoint = Math.random() < 0.51; // slight bias to prevent exact tie draws
      
      let nextP1 = simPointsT1;
      let nextP2 = simPointsT2;

      if (t1WinsPoint) {
        nextP1++;
        setSimPointsT1(nextP1);
      } else {
        nextP2++;
        setSimPointsT2(nextP2);
      }

      // Live description
      const pointWinnerName = t1WinsPoint ? t1Name : t2Name;
      const commentary = getVolleyCommentary(pointWinnerName, t1WinsPoint ? t2Name : t1Name, nextP1, nextP2);
      const currentScoreString = `[Set ${simCurrentSet}] ${t1Name} ${nextP1} - ${nextP2} ${t2Name}`;
      setLiveTicker(`${commentary} ➔ ${currentScoreString}`);

      // Push real-time event ticker to individual match card
      const updatedMatchesTicker = matches.map(m => {
        if (m.id === liveSimulatingMatchId) {
          return {
            ...m,
            livePointTicker: `${pointWinnerName} assegna punto! ${nextP1}-${nextP2}`,
            sets: [...simCompletedSets, { team1: nextP1, team2: nextP2 }]
          };
        }
        return m;
      });
      onUpdateMatches(updatedMatchesTicker);

      // Check if Set concluded
      if ((nextP1 >= targetPoints || nextP2 >= targetPoints) && Math.abs(nextP1 - nextP2) >= 2) {
        // Set finished
        const finalSetScore: SetScore = { team1: nextP1, team2: nextP2 };
        const updatedCompleted = [...simCompletedSets, finalSetScore];
        setSimCompletedSets(updatedCompleted);

        let nextSetsT1 = simSetsT1;
        let nextSetsT2 = simSetsT2;

        if (nextP1 > nextP2) {
          nextSetsT1++;
          setSimSetsT1(nextSetsT1);
        } else {
          nextSetsT2++;
          setSimSetsT2(nextSetsT2);
        }

        // Check if Match finished
        const matchWinnerOfSets = nextSetsT1 >= 2 ? matchObj.team1.id : nextSetsT2 >= 2 ? matchObj.team2.id : null;

        if (matchWinnerOfSets) {
          // Complete entire simulator
          const finalMatch: Match = {
            ...matchObj,
            status: 'completed',
            team1Score: nextSetsT1,
            team2Score: nextSetsT2,
            sets: updatedCompleted,
            winnerId: matchWinnerOfSets,
            livePointTicker: undefined,
          };
          
          clearInterval(interval);
          setLiveSimulatingMatchId(null);
          propagateWinner(finalMatch);
        } else {
          // Proceed to next set
          setSimCurrentSet(simCurrentSet + 1);
          setSimPointsT1(0);
          setSimPointsT2(0);
          setLiveTicker(`Fine Set ${simCurrentSet}! Risultato: ${nextP1}-${nextP2}. Gli atleti cambiano campo di gioco... 🏝️`);
        }
      }

    }, 2500); // point every 2.5 seconds feels engaging but fast!

    return () => clearInterval(interval);
  }, [liveSimulatingMatchId, simPointsT1, simPointsT2, simCurrentSet, simSetsT1, simSetsT2, simCompletedSets, matches]);


  // Synchronize tabs and groups on load
  const groupMatches = matches.filter(m => m.phase === 'gironi');
  const groupNames = Array.from(new Set(groupMatches.map(m => m.groupName).filter(Boolean))) as string[];

  const qualifiedTeamIds = React.useMemo(() => {
    const sortedAvulsa = computeFipavStandings(teams, groupMatches);
    const qualifiedCount = activeTournamentConfig?.qualifiedCount || 4;
    return new Set(sortedAvulsa.slice(0, qualifiedCount).map(t => t.id));
  }, [teams, groupMatches, activeTournamentConfig?.qualifiedCount]);

  useEffect(() => {
    const hasGironi = matches.some(m => m.phase === 'gironi');
    if (hasGironi) {
      setActivePhaseTab('gironi');
    } else {
      setActivePhaseTab('eliminazione');
    }
  }, [matches.length]);

  useEffect(() => {
    if (groupNames.length > 0 && (!selectedGroupTab || !groupNames.includes(selectedGroupTab))) {
      setSelectedGroupTab(groupNames[0]);
    }
  }, [groupNames, selectedGroupTab]);

  // Handle advancing to Phase 2 (Playoffs Bracket)
  const handleUnlockPlayoffs = () => {
    const isFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
    if (!isFinished) {
      setAlertMessage("Completare tutte le partite della fase a gironi per sbloccare i playoff!");
      return;
    }

    // Compute standings per group
    const groupsStandings = computeGroupStandings(teams, groupMatches);
    const firstMatch = matches[0];
    const ptsSet = firstMatch?.pointsPerSet || 21;
    const mSets = firstMatch?.maxSets || 3;
    const resolvedQualifiedCount = activeTournamentConfig?.qualifiedCount || 4;

    // Dynamically calculate sequential start hour for playoff matches from the actual end of group stage
    let playoffStartHour = '15:30';
    if (groupMatches.length > 0) {
      let latestEndMinutes = 9 * 60; // 09:00
      groupMatches.forEach(m => {
        if (m.time && m.time.includes(':')) {
          const matchDuration = getSingleMatchDuration(m.pointsPerSet, m.maxSets);
          const [h, min] = m.time.split(':').map(Number);
          const endMins = h * 60 + min + matchDuration;
          if (endMins > latestEndMinutes) {
            latestEndMinutes = endMins;
          }
        }
      });
      const hStr = String(Math.floor(latestEndMinutes / 60) % 24).padStart(2, '0');
      const mStr = String(latestEndMinutes % 60).padStart(2, '0');
      playoffStartHour = `${hStr}:${mStr}`;
    }

    const activeCourtCount = activeTournamentConfig?.courtCount || courtCount;
    const activeSfPointsPerSet = activeTournamentConfig?.sfPointsPerSet || sfPointsPerSet;
    const activeSfMaxSets = activeTournamentConfig?.sfMaxSets || sfMaxSets;

    const playoffMatches = generatePlayoffsFromGroups(
      groupsStandings,
      playoffStartHour,
      40,
      activeCourtCount,
      ptsSet,
      mSets,
      activeSfPointsPerSet,
      activeSfMaxSets,
      resolvedQualifiedCount,
      teams,
      groupMatches,
      activeTournamentConfig?.include3rd4th !== false,
      activeTournamentConfig?.breakStart,
      activeTournamentConfig?.breakEnd
    );

    onUpdateMatches([...matches, ...playoffMatches]);

    onAddNotification({
      id: `notif-playoffs-${Date.now()}`,
      title: '🏆 Tabellone Playoff Generato!',
      message: 'La fase a gironi è conclusa! Le migliori squadre si sono qualificate ufficialmente per la fase ad eliminazione diretta.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'schedule_change',
    });

    setActivePhaseTab('eliminazione');
  };

  // Initialize tournament config with preloaded structures
  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto adjust groupCount logically if pools config chosen
    let resolvedGroupCount = groupCount;

    onGenerateTournament({
      name: tournamentName,
      formula,
      teamsCount: formula === 'double_elim' ? 8 : teamsCount,
      groupCount: (formula === 'direct' || formula === 'double_elim') ? 1 : resolvedGroupCount,
      courtCount,
      pointsPerSet,
      maxSets,
      sfPointsPerSet,
      sfMaxSets,
      qualifiedCount: formula === 'combined' ? combinedQualifiedTeams : undefined,
      include3rd4th,
      breakStart: breakStart || undefined,
      breakEnd: breakEnd || undefined
    });
  };

  // Group matches by round for Visual Bracket (filter out group stage matches to avoid overlap with playoff rounds)
  const playoffMatchesOnly = matches.filter(m => m.phase !== 'gironi');

  const roundsMap = playoffMatchesOnly.reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {} as Record<number, Match[]>);

  // Always keep playoff matches sorted chronologically by start time, and then by court to maintain consistent order
  Object.keys(roundsMap).forEach((rKey) => {
    const rNum = Number(rKey);
    roundsMap[rNum] = roundsMap[rNum].sort((a, b) => {
      const aTime = a.time ? parseTimeToMinutes(a.time) : 0;
      const bTime = b.time ? parseTimeToMinutes(b.time) : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.court || '').localeCompare(b.court || '');
    });
  });

  const totalRoundsCount = Object.keys(roundsMap).length;

  // Helper to get the correct label for a round group of playoff matches
  const getRoundDisplayLabel = (roundNum: number, roundMatches: Match[]) => {
    if (!roundMatches || roundMatches.length === 0) return `Turno ${roundNum}`;
    
    // Check if the round matches include both a 3rd/4th final and a Grand Final, or if any match is for 3rd/4th place
    const has3rdPlace = roundMatches.some(m => m.roundLabel && (m.roundLabel.toLowerCase().includes('3°') || m.roundLabel.toLowerCase().includes('3rd')));
    
    if (has3rdPlace) {
      return 'Finali';
    }
    
    return roundMatches[0]?.roundLabel || `Turno ${roundNum}`;
  };

  return (
    <div id="bracket-page-root" className="space-y-8">
      {/* Dynamic Tournament Configuration Panel (Visible if no matches generated yet) */}
      {matches.length === 0 ? (
        <div id="tournament-setup-card" className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border-4 border-orange-300 p-8 text-center space-y-6 relative overflow-hidden">
          {!isAdmin && (
            <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-25 rounded-3xl animate-in fade-in duration-200">
              <div className="p-4 bg-sky-50 rounded-full border-4 border-sky-300 text-sky-500 mb-4 animate-bounce">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-base uppercase italic">Configurazione Forbita 🔒</h4>
              <p className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">Accesso Limitato (Admin Only)</p>
              <p className="text-xs font-medium text-slate-600 mt-3 leading-relaxed max-w-xs">
                La pianificazione e la generazione delle griglie o tabelloni del torneo è una funzione riservata all'account dell'<strong>Amministratore</strong>.
              </p>
              <p className="text-[10px] font-bold text-sky-600 mt-4 leading-relaxed bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 font-sans">
                🔒 Effettua il login come amministratore per abilitare la generazione automatica.
              </p>
            </div>
          )}
          <div className="w-16 h-16 bg-orange-100 border-2 border-orange-300 rounded-full flex items-center justify-center mx-auto text-orange-600">
            <Award className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-orange-700 uppercase italic tracking-tight font-sans">Crea Tabellone Torneo</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 max-w-sm mx-auto">
              Configura la formula più adatta al numero di coppie iscritte. Il sistema distribuirà e accoppierà i partecipanti.
            </p>
          </div>

          <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            {/* Nome Torneo */}
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="setup-tournament-name" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nome dell'Evento</label>
              <input
                id="setup-tournament-name"
                type="text"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-semibold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                required
              />
            </div>

            {/* Formula select */}
            <div className="space-y-1">
              <label htmlFor="setup-formula" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Formula del Torneo</label>
              <select
                id="setup-formula"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                value={formula}
                onChange={(e) => {
                  const val = e.target.value as 'direct' | 'pools' | 'combined' | 'double_elim';
                  setFormula(val);
                  setTeamsCount(getSmartDefaultTeamsCount(val));
                }}
              >
                <option value="direct">Eliminazione Diretta 🏆</option>
                <option value="pools">Solo Gironi all'Italiana 🏐</option>
                <option value="combined">Fasi Multiple: Gironi + Playoff 🥇</option>
                <option value="double_elim">Vincenti e Perdenti (Doppia Eliminazione) 🔄</option>
              </select>
            </div>

            {/* Numero Squadre / Gironi + Playoff Selector */}
            {formula === 'combined' ? (
              <>
                <div className="space-y-1">
                  <label htmlFor="combined-groups-count" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Numero di Gironi</label>
                  <select
                    id="combined-groups-count"
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                    value={combinedGroups}
                    onChange={(e) => setCombinedGroups(Number(e.target.value))}
                  >
                    <option value={1}>1 Girone</option>
                    <option value={2}>2 Gironi</option>
                    <option value={3}>3 Gironi 🏐</option>
                    <option value={4}>4 Gironi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="combined-teams-per-group" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Squadre per Girone</label>
                  <select
                    id="combined-teams-per-group"
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                    value={combinedTeamsPerGroup}
                    onChange={(e) => setCombinedTeamsPerGroup(Number(e.target.value))}
                  >
                    <option value={1}>1 Squadra</option>
                    <option value={2}>2 Squadre</option>
                    <option value={3}>3 Squadre</option>
                    <option value={4}>4 Squadre (Standard)</option>
                    <option value={5}>5 Squadre</option>
                    <option value={6}>6 Squadre</option>
                    <option value={7}>7 Squadre</option>
                    <option value={8}>8 Squadre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="combined-qualified-count" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Squadre Ammesse ai Playoff</label>
                  <select
                    id="combined-qualified-count"
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                    value={combinedQualifiedTeams}
                    onChange={(e) => setCombinedQualifiedTeams(Number(e.target.value))}
                  >
                    <option value={2}>2 Squadre (Finale) 🏆</option>
                    <option value={4}>4 Squadre (Semifinali) 🥈</option>
                    <option value={8}>8 Squadre (Quarti) 🥇</option>
                    <option value={16}>16 Squadre (Ottavi) 🎯</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Posti Totali Disponibili</label>
                  <div className="px-3 py-2 rounded-xl border-2 border-orange-200 bg-orange-50 font-black text-orange-700 text-sm flex items-center h-[38px]">
                    🥇 {teamsCount} Squadre totali
                  </div>
                </div>

                {/* Proposed Dynamic Solutions info box */}
                <div className="md:col-span-2 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-xs font-black text-blue-950 uppercase tracking-widest">
                      CONFIGURAZIONE QUALIFICAZIONE PLAYOFF
                    </span>
                  </div>
                  <p className="text-sm font-bold text-blue-800 leading-relaxed">
                    {getCombinedQualificationExplanation(combinedGroups, combinedTeamsPerGroup, combinedQualifiedTeams)}
                  </p>
                  <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                    🏝️ Le squadre qualificate verranno stabilite dinamicamente in base alla classifica avulsa generale.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label htmlFor="setup-teams-count" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Numero Squadre</label>
                <select
                  id="setup-teams-count"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                  value={teamsCount}
                  onChange={(e) => setTeamsCount(Number(e.target.value))}
                  disabled={formula === 'double_elim'}
                >
                  {getTeamsCountOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Numero Gironi (Only visible for pools formula) */}
            {formula === 'pools' && (
              <div className="space-y-1">
                <label htmlFor="setup-group-count" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Numero di Gironi</label>
                <select
                  id="setup-group-count"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                >
                  {teamsCount <= 6 && <option value={1}>1 Girone Unico</option>}
                  {teamsCount > 6 && teamsCount <= 12 && (
                    <>
                      <option value={1}>1 Girone Unico</option>
                      <option value={2}>2 Gironi</option>
                    </>
                  )}
                  {teamsCount > 12 && (
                    <>
                      <option value={2}>2 Gironi</option>
                      <option value={4}>4 Gironi</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Campi di gioco */}
            <div className={`space-y-1 ${formula !== 'pools' ? 'md:col-span-2' : ''}`}>
              <label htmlFor="setup-court-count" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Campi Disponibili</label>
              <select
                id="setup-court-count"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                value={courtCount}
                onChange={(e) => setCourtCount(Number(e.target.value))}
              >
                <option value={1}>1 Campo da gioco</option>
                <option value={2}>2 Campi da gioco</option>
                <option value={3}>3 Campi (Grandi eventi)</option>
                <option value={4}>4 Campi (Beach Slam)</option>
              </select>
            </div>

            {/* Punti per Set */}
            <div className="space-y-1">
              <label htmlFor="setup-points-per-set" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Punti al Set</label>
              <select
                id="setup-points-per-set"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                value={pointsPerSet}
                onChange={(e) => setPointsPerSet(Number(e.target.value) as 15 | 21)}
              >
                <option value={21}>Set a 21 punti (Standard)</option>
                <option value={15}>Set a 15 punti (Veloce / Short)</option>
              </select>
            </div>

            {/* Numero di Set */}
            <div className="space-y-1">
              <label htmlFor="setup-max-sets" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Numero di Set</label>
              <select
                id="setup-max-sets"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                value={maxSets}
                onChange={(e) => setMaxSets(Number(e.target.value) as 1 | 3)}
              >
                <option value={3}>Al meglio dei 3 set (2 vinti)</option>
                <option value={1}>Set Singolo (1 set unico)</option>
              </select>
            </div>

            {/* Punti per Set Finali */}
            {formula !== 'pools' && (
              <>
                <div className="space-y-1">
                  <label htmlFor="setup-sf-points-per-set" className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-orange-500" /> Punti Set (Finali)
                  </label>
                  <select
                    id="setup-sf-points-per-set"
                    className="w-full px-3 py-2 rounded-xl border-2 border-orange-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                    value={sfPointsPerSet}
                    onChange={(e) => setSfPointsPerSet(Number(e.target.value) as 15 | 21)}
                  >
                    <option value={21}>Set a 21 punti (Standard)</option>
                    <option value={15}>Set a 15 punti (Veloce / Short)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="setup-sf-max-sets" className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-orange-500" /> Num Set (Finali)
                  </label>
                  <select
                    id="setup-sf-max-sets"
                    className="w-full px-3 py-2 rounded-xl border-2 border-orange-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                    value={sfMaxSets}
                    onChange={(e) => setSfMaxSets(Number(e.target.value) as 1 | 3)}
                  >
                    <option value={3}>Al meglio dei 3 set (2 vinti)</option>
                    <option value={1}>Set Singolo (1 set unico)</option>
                  </select>
                </div>
              </>
            )}

            {/* Finale 3° e 4° Posto */}
            {(formula === 'direct' || formula === 'combined') && (
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="setup-include-3rd-4th" className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  🥉 Finale 3° e 4° Posto
                </label>
                <select
                  id="setup-include-3rd-4th"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                  value={include3rd4th ? 'true' : 'false'}
                  onChange={(e) => setInclude3rd4th(e.target.value === 'true')}
                >
                  <option value="true">Sì, disputa la finale 3°/4° posto (Medaglia di Bronzo 🥉)</option>
                  <option value="false">No, non disputare la finale 3°/4° posto</option>
                </select>
              </div>
            )}

            {/* Fascia Oraria di Riposo (Pausa) */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2 p-4 bg-orange-50/50 border border-orange-200 rounded-2xl">
              <div className="col-span-2">
                <h4 className="text-sm font-black text-orange-700 flex items-center gap-1.5">
                  ☕ Fascia Oraria di Riposo (Pausa pranzo/relax)
                </h4>
                <p className="text-[11px] text-slate-500 font-bold leading-tight mt-0.5">
                  Durante questa fascia oraria non verranno schedulate partite. Riprenderanno regolarmente al suo termine.
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="setup-break-start" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  ORA INIZIO
                </label>
                <select
                  id="setup-break-start"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                >
                  <option value="">Nessuna pausa</option>
                  {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                    <option key={`start-${t}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="setup-break-end" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  ORA FINE
                </label>
                <select
                  id="setup-break-end"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:border-orange-400 text-sm"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                >
                  <option value="">Nessuna pausa</option>
                  {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                    <option key={`end-${t}`} value={t} disabled={breakStart !== "" && t <= breakStart}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Explanatory Info text depending on configuration */}
            <div className="md:col-span-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 font-semibold space-y-1 leading-relaxed">
              {formula === 'direct' && (
                <p>🏆 Formula classica ad eliminazione diretta: le squadre perdenti vengono eliminate subito. Prevede un tabellone da {teamsCount} slot totali (con passaggi automatici del turno in presenza di BYE/riposi).</p>
              )}
              {formula === 'pools' && (
                <p>🏐 Formula all'italiana: {groupCount === 1 ? "girone unico" : `${groupCount} gironi separati`} di sola andata. Classifica definita in base a vittorie, quoziente set e quoziente punti.</p>
              )}
              {formula === 'combined' && (
                <p>
                  🥇 Fase 1: {combinedGroups === 1 ? '1 Girone unico' : `${combinedGroups} Gironi`} da {combinedTeamsPerGroup} squadre ciascuno con classifica live.
                  <br />
                  Fase 2: {combinedQualifiedTeams} squadre in totale si qualificano ai playoff ad eliminazione diretta cominciando con la fase di {getRoundName(combinedQualifiedTeams)}!
                </p>
              )}
              {formula === 'double_elim' && (
                <p>🔄 Formula Vincenti e Perdenti (Doppia Eliminazione a 8): Si inizia tutti nel Primo Turno (4 match). I vincitori giocano nel Tabellone Vincenti (2 match) e i perdenti nel Tabellone Perdenti (2 match). Da ciascun tabellone usciranno 2 squadre che si sfideranno poi nelle Semifinali incrociate e nella Finale!</p>
              )}
            </div>

            {/* Penalized/Excluded teams notice when teams registered exceeds selection limit */}
            {teams.length > teamsCount && (
              <div id="excluded-teams-alert" className="md:col-span-2 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-black text-rose-700 uppercase tracking-wider text-[11px]">
                  <span>⚠️ Attenzione: Esclusione Squadre in Eccesso</span>
                </div>
                <p className="font-semibold">
                  Ci sono {teams.length} squadre iscritte ma la formula selezionata ne ammette massimo <strong className="text-rose-900">{teamsCount}</strong>. Le squadre iscritte per ultime in ordine cronologico rimarranno escluse e registrate come riserve in caso di ritiri prima del torneo:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {excludedTeamsList.map((team, idx) => {
                    const timePart = team.registeredAt.includes(' ') ? team.registeredAt.split(' ')[1].substring(0, 5) : '';
                    const datePart = team.registeredAt.includes(' ') ? team.registeredAt.split(' ')[0] : team.registeredAt;
                    const displayTime = timePart ? `${datePart} alle ${timePart}` : datePart;
                    return (
                      <span
                        key={team.id}
                        className="inline-flex items-center bg-white text-rose-700 text-[10px] px-2.5 py-1.5 rounded-xl border-2 border-rose-200 font-extrabold shadow-sm"
                        title={displayTime}
                      >
                        {idx + 1}. {team.name} ({timePart || 'Ultima'})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tournament Duration & Match Stats Bento Card */}
            <div className="md:col-span-2 p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 rounded-2xl border-2 border-slate-700 text-white shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2.5">
                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                <h4 className="font-black text-xs uppercase tracking-wider text-orange-300">Stima Tempi e Carico Ore Torneo 🕒</h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-1">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partite Reali</span>
                  <span className="text-xl font-black mt-1 text-sky-300">{setupStats.realMatchesCount} <span className="text-xs font-normal text-slate-400">match</span></span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Durata Match</span>
                  {setupStats.hasDifferentSFParams ? (
                    <div className="mt-1 space-y-0.5 text-left">
                      <div className="text-[11.5px] font-extrabold text-orange-300 leading-tight">
                        Gen: <span className="text-sm font-black text-white">{setupStats.singleMatchDuration}</span> min
                      </div>
                      <div className="text-[11.5px] font-extrabold text-rose-300 leading-tight flex items-center gap-0.5">
                        Finali: <span className="text-sm font-black text-white">{setupStats.sfMatchDuration}</span> min
                      </div>
                    </div>
                  ) : (
                    <span className="text-xl font-black mt-1 text-orange-300">
                      {setupStats.singleMatchDuration} <span className="text-xs font-normal text-slate-400">min</span>
                    </span>
                  )}
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Gioco</span>
                  <span className="text-xl font-black mt-1 text-emerald-300">
                    {Math.floor(setupStats.totalRawMinutes / 60)}h {setupStats.totalRawMinutes % 60}m
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between ring-2 ring-orange-500/20">
                  <span className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Durata Torneo</span>
                  <div>
                    <span className="text-xl font-black mt-1 text-amber-300 block">
                      {Math.floor(setupStats.totalElapsedMinutes / 60)}h {setupStats.totalElapsedMinutes % 60}m
                    </span>
                    {setupStats.hasBreak && (
                      <span className="text-[9.5px] font-bold text-orange-300 mt-1 block leading-tight">
                        ☕ Pausa: {setupStats.breakStart} - {setupStats.breakEnd} ({setupStats.breakDuration}m)
                      </span>
                    )}
                    <span className="text-[10px] font-black text-emerald-400 mt-1 block leading-tight border-t border-slate-705/30 pt-1">
                      🏁 Fine: ~{setupStats.endHour}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                * La stima teorica tiene conto dello svolgimento su <strong className="text-slate-200">{courtCount} {courtCount === 1 ? 'campo' : 'campi'}</strong> in contemporanea ed esclude i match di riposo (BYE). 
                <br />
                Parametri: Set al meglio di <strong className="text-slate-200">{maxSets}</strong>, fino a <strong className="text-slate-200">{pointsPerSet}</strong> punti per set
                ({maxSets === 1 ? (pointsPerSet === 15 ? '1 set a 15 punti = 15 min' : '1 set a 21 punti = 20 min') : (pointsPerSet === 15 ? 'al meglio di 3 set a 15 punti = 45 min' : 'al meglio di 3 set a 21 punti = 50 min')}).
                {formula !== 'pools' && (maxSets !== sfMaxSets || pointsPerSet !== sfPointsPerSet) && (
                  <>
                    <br />
                    <span className="text-orange-300">⚠️ Finali: Set al meglio di <strong className="text-orange-200">{sfMaxSets}</strong>, fino a <strong className="text-orange-200">{sfPointsPerSet}</strong> punti per set ({sfMaxSets === 1 ? (sfPointsPerSet === 15 ? '15 min' : '20 min') : (sfPointsPerSet === 15 ? '45 min' : '50 min')}).</span>
                  </>
                )}
              </p>
            </div>

            {/* Stats Check */}
            <div className="md:col-span-2 pt-2 text-center text-xs font-bold text-slate-500/80 uppercase tracking-widest flex justify-center gap-4">
              <span>Squadre iscritte: <strong className="text-emerald-600">{teams.length}</strong></span>
              <span>Richieste: <strong className="text-orange-600">{teamsCount}</strong></span>
            </div>

            <div className="md:col-span-2 pt-3">
              <button
                id="generate-bracket-action-btn"
                type="submit"
                className="w-full py-3 px-4 rounded-full font-black tracking-wider uppercase italic shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-0.5 border-b-4 bg-orange-400 border-orange-600 hover:bg-orange-500 hover:border-orange-700 text-white"
              >
                <Shuffle className="w-4 h-4 stroke-[3]" />
                {teams.length < teamsCount ? 'Genera Torneo con BYE 🏖️' : 'Genera Torneo Adesso 🏖️'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Header Controls for Active Tournament */}
          {canWrite && (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-855 p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden">
            {/* Decorative subtle ambient light overlay */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

            {/* Top Bar: Title & Action */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 ${isHeaderExpanded ? 'pb-4 border-b border-slate-800/80' : ''}`}>
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                  </span>
                  <h3 className="font-black text-xl lg:text-2xl tracking-tight uppercase italic text-white leading-tight">
                    {tournamentName}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-semibold tracking-wide flex items-center gap-2">
                  <span>SCHEDA TECNICA TORNEO</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                <button
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-black text-xs tracking-wider uppercase py-2.5 px-4 rounded-xl border border-slate-700 transition-all shadow-md"
                >
                  {isHeaderExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Riduci Scheda</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Mostra Dettagli</span>
                    </>
                  )}
                </button>
                {isAdmin && (
                  <button
                    id="reset-tournament-btn"
                    onClick={() => setShowResetConfirmModal(true)}
                    className="bg-slate-800 hover:bg-rose-950/45 text-rose-400 hover:text-rose-350 font-black text-xs tracking-wider uppercase py-2.5 px-4 rounded-xl border border-slate-755 hover:border-rose-900/60 transition-all shadow-md active:translate-y-0.5 shrink-0"
                  >
                    Azzera Torneo
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isHeaderExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="flex flex-col gap-6 overflow-hidden w-full z-10"
                >
                  {/* Formula Highlight banner with Description & Detailed Playoff Qualification Criteria */}
                  <div className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-4">
                    <div className="text-[10px] font-black tracking-widest text-orange-400 uppercase mb-1">
                      Formula Generale del Torneo
                    </div>
                    <h4 className="text-sm font-extrabold text-white mb-2 uppercase tracking-wide">
                      {formulaName}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                      {formulaDescription}
                    </p>
                    {activeFormula === 'combined' && (
                      <p className="text-xs text-amber-300 font-semibold mt-2.5 border-t border-slate-800/60 pt-2.5 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>{getCombinedQualificationExplanation(activeGroupCount, Math.ceil(activeTeamsCount / activeGroupCount), activeQualifiedCount)}</span>
                      </p>
                    )}
                  </div>

                  {/* Bento Grid Configuration Sections - All 19 Information Items presented in an ordered, professional layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Card 1: Formato Gara & Regolamento */}
                    <div className="bg-slate-855/35 border border-slate-800/65 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                          <span className="text-amber-400">⚡</span> Formato & Regole
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Incontri Gironi:</span>
                            <span className="text-white font-bold text-right break-words leading-tight" title={regSetsLabel}>{regSetsLabel}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Incontri Finali:</span>
                            <span className="text-white font-bold text-right break-words leading-tight" title={sfSetsLabel}>{sfSetsLabel}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Finale 3°/4° Posto:</span>
                            <span className="text-white font-bold">{activeInclude3rd4th ? 'Disputata 🥉' : 'Non prevista'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Durata Match Standard:</span>
                            <span className="text-amber-300 font-bold">{generalMatchDuration} min</span>
                          </div>
                          {activeFormula !== 'pools' && (
                            <div className="flex justify-between py-1 gap-2">
                              <span className="text-slate-400 shrink-0">Durata Match Finali:</span>
                              <span className="text-amber-400 font-bold">{sfMatchDuration} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Partecipanti e Iscrizioni */}
                    <div className="bg-slate-855/35 border border-slate-800/65 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                          <span className="text-sky-400">👥</span> Iscritti & Riserve
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Coppie Iscritte:</span>
                            <span className="text-sky-300 font-extrabold">{teams.length} Coppie</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Coppie Ammesse:</span>
                            <span className="text-white font-black">{activeTeamsCount} Coppie</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Coppie Riserve:</span>
                            <span className={`font-bold ${Math.max(0, teams.length - activeTeamsCount) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                              {Math.max(0, teams.length - activeTeamsCount)} {Math.max(0, teams.length - activeTeamsCount) === 1 ? 'coppia' : 'coppie'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 gap-2">
                            <span className="text-slate-400 shrink-0">Nome Torneo:</span>
                            <span className="text-white font-medium text-right break-words leading-tight" title={tournamentName}>{tournamentName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Gironi & Qualificazione */}
                    <div className="bg-slate-855/35 border border-slate-800/65 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                          <span className="text-emerald-400">🧱</span> Gironi & Playoff
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Numero Gironi:</span>
                            <span className="text-white font-bold">
                              {activeFormula === 'pools' || activeFormula === 'combined' ? `${activeGroupCount} ${activeGroupCount === 1 ? 'Girone' : 'Gironi'}` : 'Non previsto'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Coppie per Girone:</span>
                            <span className="text-white font-bold">
                              {activeFormula === 'pools' || activeFormula === 'combined' ? `${Math.round(activeTeamsCount / activeGroupCount)} coppie` : 'Non applicabile'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Qualificate ai Playoff:</span>
                            <span className="text-white font-black text-emerald-400 text-right leading-tight">
                              {activeFormula === 'combined' ? `${activeQualifiedCount} coppie` : 'Non previsto'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 gap-2">
                            <span className="text-slate-400 shrink-0">Campi Attivi Gioco:</span>
                            <span className="text-white font-black text-orange-300">
                              {activeCourtCount} {activeCourtCount === 1 ? 'Campo' : 'Campi'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Stime, Orari, Carico & Riposo */}
                    <div className="bg-slate-855/40 border border-slate-750/70 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-amber-500 to-rose-500"></div>
                      <div>
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                          <span className="text-rose-400">🕒</span> Tempi, Svolgimento & Fine
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Partite Reali:</span>
                            <span className="text-white font-bold">{activeStats.realMatchesCount} match</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Volume di Gioco Totale:</span>
                            <span className="text-emerald-400 font-bold">
                              {Math.floor(activeStats.totalRawMinutes / 60)}h {activeStats.totalRawMinutes % 60}m
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Inizio Torneo:</span>
                            <span className="text-orange-300 font-bold break-words text-right leading-tight">
                              {hasActiveMatches && activeStats.earliestMinutes !== undefined ? formatMinutesToTime(activeStats.earliestMinutes) : '09:00'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Pausa Torneo:</span>
                            <span className="text-slate-200 font-bold break-words text-right leading-tight">
                              {activeStats.hasBreak ? `☕ ${activeStats.breakStart} - ${activeStats.breakEnd}` : 'Non prevista'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/40 gap-2">
                            <span className="text-slate-400 shrink-0">Durata Stimata Torneo:</span>
                            <span className="text-amber-400 font-black">{Math.floor(activeStats.totalElapsedMinutes / 60)}h {activeStats.totalElapsedMinutes % 60}m</span>
                          </div>
                          <div className="flex justify-between py-1 items-center gap-2">
                            <span className="text-slate-400 font-semibold shrink-0">Fine Stimata Torneo 🏁:</span>
                            <span className="text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md animate-pulse">
                              ~{activeStats.endHour || 'Finita'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* Sezione Stampe e Report Ufficiali - Custom upgraded to match the dark slate aesthetic of the main Technical Sheet */}
          {canWrite && (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-855 p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden mt-6">
              {/* Decorative subtle ambient light overlay */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 ${isPrintExpanded ? 'pb-4 border-b border-slate-800/80' : ''}`}>
                <div className="space-y-1.5 animate-fade-in">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                    </span>
                    <h3 className="font-black text-xl lg:text-2xl tracking-tight uppercase italic text-white leading-tight flex items-center gap-2">
                      <Printer className="w-5 h-5 text-orange-400 stroke-[2.5]" />
                      <span>AREA STAMPA</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold tracking-wide">
                    Generazione report PDF ufficiali del torneo da stampare o salvare
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap z-10">
                  <button
                    type="button"
                    onClick={() => setIsPrintExpanded(!isPrintExpanded)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-black text-xs tracking-wider uppercase py-2.5 px-4 rounded-xl border border-slate-700 transition-all shadow-md"
                  >
                    {isPrintExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-orange-400 shrink-0" />
                        <span>Riduci Area</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" />
                        <span>Mostra Area</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <AnimatePresence initial={false}>
                {isPrintExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden w-full z-10"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      <button
                        type="button"
                        id="print-btn-tournament-info"
                        onClick={handlePrintTournamentInfo}
                        className="flex items-center justify-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:border-orange-500/40 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
                      >
                        <Info className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                        Info & Formula Torneo
                      </button>

                      <button
                        type="button"
                        id="print-btn-entry-list"
                        onClick={handlePrintEntryList}
                        className="flex items-center justify-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:border-orange-500/40 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
                      >
                        <FileText className="w-4 h-4 text-sky-400 stroke-[2.5]" />
                        Lista d'Ingresso
                      </button>
                      
                      <button
                        type="button"
                        id="print-btn-groups-pools"
                        onClick={handlePrintGroupsAndPools}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                          matches.some(m => m.phase === 'gironi')
                            ? 'bg-slate-850 hover:bg-slate-800 text-slate-205 border border-slate-750 hover:border-orange-500/40 active:translate-y-0.5'
                            : 'bg-slate-850/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50'
                        }`}
                        disabled={!matches.some(m => m.phase === 'gironi')}
                        title={!matches.some(m => m.phase === 'gironi') ? "La formula attuale non prevede incontri a gironi" : "Stampa i gironi e i relativi incontri"}
                      >
                        <ListFilter className={`w-4 h-4 ${matches.some(m => m.phase === 'gironi') ? 'text-amber-400' : 'text-slate-600'} stroke-[2.5]`} />
                        Composizione & Gare Gironi
                      </button>
                      
                      <button
                        type="button"
                        id="print-btn-ordered-matches"
                        onClick={handlePrintOrderedMatches}
                        className="flex items-center justify-center gap-2 bg-slate-855 hover:bg-slate-800 text-slate-200 border border-slate-755 hover:border-orange-500/40 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
                      >
                        <Clock className="w-4 h-4 text-orange-400 stroke-[2.5]" />
                        Elenco Ordinato Gare
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-4 italic font-medium">
                      * Cliccando sui pulsanti si aprirà una nuova scheda pronta per l'invio alla tua stampante o per essere salvata come file PDF sul tuo dispositivo.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Phase selector tabs for multi-phase tournaments */}
          {matches.some(m => m.phase === 'gironi') && (
            <div className="flex bg-sky-900/10 p-1 rounded-2xl border border-sky-950/20 max-w-md mx-auto">
              <button
                onClick={() => setActivePhaseTab('gironi')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activePhaseTab === 'gironi'
                    ? 'bg-amber-400 text-white shadow-md'
                    : 'text-sky-950 hover:bg-sky-900/5'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                Fase 1: Gironi (Pool Stage)
              </button>
              <button
                onClick={() => {
                  const hasPlayoffs = matches.some(m => m.phase === 'eliminazione');
                  if (!hasPlayoffs) {
                    setAlertMessage('Completa la Fase a Gironi e clicca su "Genera Playoff" per sbloccare la Fase ad Eliminazione Diretta!');
                    return;
                  }
                  setActivePhaseTab('eliminazione');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activePhaseTab === 'eliminazione'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-sky-950 hover:bg-sky-900/5'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Fase 2: Playoff (Tabellone)
              </button>
            </div>
          )}

          {/* Simulated point tracker ticker box if a simulation is active */}
          <AnimatePresence>
            {liveSimulatingMatchId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                id="live-ticker-box"
                className="bg-orange-100 border-4 border-orange-400 rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2 bg-orange-400 text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-widest animate-pulse">
                  SIMULAZIONE LIVE IN CORSO
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-orange-300 rounded-full text-orange-850 text-[10px] font-black tracking-widest uppercase shadow-sm mt-3">
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  COMMENTATORE AUTOMATICO
                </div>
                <p id="live-ticker-text" className="text-base font-black text-slate-800 uppercase italic mt-1">
                  "{liveTicker}"
                </p>
                <div className="w-full max-w-md bg-white border-2 border-orange-200 h-3 rounded-full overflow-hidden mt-2 p-0.5 shadow-inner">
                  <div className="h-full bg-orange-500 rounded-full animate-pulse transition-all duration-300 w-2/3 mx-auto"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RENDERING DEPENDING ON ACTIVE PHASE TAB */}
          {activePhaseTab === 'gironi' ? (
            /* PHASE 1: GIRONI (POOL PLAYSTAGE) VIEW */
            <div id="gironi-phase-view" className="space-y-6">
              {/* Toggle Mode: View by Group / List of All Matches (2-line unified layout) */}
              <div className="flex justify-center items-stretch gap-4 bg-slate-100 p-1.5 rounded-3xl w-full max-w-sm mx-auto border-2 border-slate-200 shadow-inner">
                <button
                  type="button"
                  id="toggle-view-pools"
                  onClick={() => setGroupViewMode('by-group')}
                  className={`flex-1 py-1 px-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                    groupViewMode === 'by-group'
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="flex flex-col items-center leading-tight">
                    <span>Classifiche</span>
                    <span>e Gironi</span>
                  </span>
                </button>
                <button
                  type="button"
                  id="toggle-view-all-list"
                  onClick={() => setGroupViewMode('all-list')}
                  className={`flex-1 py-1 px-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                    groupViewMode === 'all-list'
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ListFilter className="w-4 h-4 text-sky-500" shrink-0 />
                  <span className="flex flex-col items-center leading-tight">
                    <span>Elenco</span>
                    <span>Gare</span>
                  </span>
                </button>
              </div>

              {groupViewMode === 'by-group' ? (
                <>
                  {/* Group pills selection */}
                  <div className="flex justify-center flex-wrap gap-2 pt-2">
                    {groupNames.map((gName) => (
                      <button
                        key={gName}
                        onClick={() => setSelectedGroupTab(gName)}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-all ${
                          selectedGroupTab === gName
                            ? 'bg-sky-950 border-sky-950 text-white shadow-md scale-105'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        🏖️ {gName}
                      </button>
                    ))}
                  </div>

                  {/* Group View dual-content grids */}
                  {selectedGroupTab && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                      
                      {/* Left Column: Group Standings */}
                      <div className="xl:col-span-5 bg-white rounded-3xl border-4 border-sky-200 p-6 shadow-xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-sky-100 pb-3">
                          <Trophy className="w-5 h-5 text-orange-400" />
                          <h4 className="font-sans font-black text-sky-950 text-sm uppercase tracking-tight">Classifica Parziale {selectedGroupTab}</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b-2 border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">
                                <th className="pb-2">Pos</th>
                                <th className="pb-2">Coppia</th>
                                <th className="pb-2 text-center text-[8px]">Gare</th>
                                <th className="pb-2 text-center text-blue-500 font-black">Pti Gara</th>
                                <th className="pb-2 text-center">V-P</th>
                                <th className="pb-2 text-center font-mono">Q.Set</th>
                                <th className="pb-2 text-center font-mono">Q.Pti</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {(() => {
                                const activeGroupMatches = groupMatches.filter(m => m.groupName === selectedGroupTab);
                                const groupTeamsInScope = teams.filter(t => t.group === selectedGroupTab);
                                const sortedGroupTeams = sortGroupStandings(computeTeamStats(groupTeamsInScope, activeGroupMatches), activeGroupMatches);

                                return sortedGroupTeams.map((team, idx) => {
                                  const isQualified = qualifiedTeamIds.has(team.id);
                                  const playedCount = team.wins + team.losses;
                                  return (
                                    <tr key={team.id} className="hover:bg-slate-50/50">
                                      <td className="py-2.5">
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                          isQualified ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="py-2.5 truncate max-w-[130px] uppercase tracking-wide font-black text-slate-800">
                                        {team.name}
                                      </td>
                                      <td className="py-2.5 text-center text-slate-500 font-extrabold">
                                        {playedCount}
                                      </td>
                                      <td className="py-2.5 text-center font-black text-blue-600 font-mono">
                                        {team.points}
                                      </td>
                                      <td className="py-2.5 text-center font-bold text-slate-600">
                                        {team.wins} - {team.losses}
                                      </td>
                                      <td className="py-2.5 text-center font-mono text-xs font-bold text-indigo-700">
                                        {team.setsWon}:{team.setsLost}
                                      </td>
                                      <td className="py-2.5 text-center font-mono text-xs font-normal text-slate-500">
                                        {team.pointsWon}:{team.pointsLost}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider pt-2 border-t border-slate-100">
                          🏝️ * Le squadre contrassegnate in arancione si qualificano per i playoff in base alla Classifica Avulsa (totale {activeTournamentConfig?.qualifiedCount || 4} qualificate).
                        </p>
                      </div>

                      {/* Right Column: Mini-Calendar/Matches of this Group */}
                      <div className="xl:col-span-7 space-y-4">
                        {/* Playoffs seeding prompt banner if group matches completed */}
                        {formula === 'combined' && (groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed')) && !matches.some(m => m.phase === 'eliminazione') && canWrite && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-orange-400 to-amber-400 border-4 border-orange-500 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-white text-left"
                          >
                            <div>
                              <h4 className="font-extrabold text-md uppercase tracking-wider flex items-center gap-2 italic">
                                <Sparkles className="w-5 h-5 animate-spin" />
                                Gironi Completati! Sblocca i Playoff
                              </h4>
                              <p className="text-xs font-bold text-orange-55 uppercase tracking-wider mt-1.5">
                                Tutti gli incontri sono finiti. Clicca per seedare e lanciare la fase finale!
                              </p>
                            </div>
                            <button
                              onClick={handleUnlockPlayoffs}
                              className="bg-white hover:bg-amber-50 text-orange-700 font-black py-2.5 px-5 rounded-full text-xs uppercase tracking-wider shrink-0 transition-all shadow-md active:translate-y-0.5 border-b-4 border-orange-205"
                            >
                              Genera Playoff 🏆
                            </button>
                          </motion.div>
                        )}

                        <h4 className="font-black text-slate-700 uppercase italic tracking-wider text-xs flex items-center gap-1.5 pt-1 bg-slate-100/30 px-3 py-1.5 rounded-xl border border-dashed border-slate-200">
                          <Calendar className="w-4 h-4 text-orange-500 font-bold" />
                          Partite del {selectedGroupTab}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[...groupMatches]
                            .filter(m => m.groupName === selectedGroupTab)
                            .sort((a, b) => {
                              if (a.time !== b.time) {
                                return a.time.localeCompare(b.time);
                              }
                              return a.court.localeCompare(b.court);
                            })
                            .map((match) => renderStandardMatchCard(match, `group-card-${match.id}`))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ALL LIST VIEW (ORDINATA PER DATA E ORA) */
                <div id="all-group-matches-list-view" className="space-y-6">
                  {/* Playoffs seeding prompt banner if group matches completed */}
                  {formula === 'combined' && (groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed')) && !matches.some(m => m.phase === 'eliminazione') && canWrite && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-orange-400 to-amber-400 border-4 border-orange-500 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-white text-left"
                    >
                      <div>
                        <h4 className="font-extrabold text-md uppercase tracking-wider flex items-center gap-2 italic">
                          <Sparkles className="w-5 h-5 animate-spin" />
                          Gironi Completati! Sblocca i Playoff
                        </h4>
                        <p className="text-xs font-bold text-orange-55 uppercase tracking-wider mt-1.5">
                          Tutti gli incontri sono finiti. Clicca per seedare e lanciare la fase finale!
                        </p>
                      </div>
                      <button
                        onClick={handleUnlockPlayoffs}
                        className="bg-white hover:bg-amber-50 text-orange-700 font-black py-2.5 px-5 rounded-full text-xs uppercase tracking-wider shrink-0 transition-all shadow-md active:translate-y-0.5 border-b-4 border-orange-200"
                      >
                        Genera Playoff 🏆
                      </button>
                    </motion.div>
                  )}

                  <div className="bg-white rounded-3xl border-4 border-sky-200 p-6 shadow-xl animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 border-b border-sky-100 pb-4 mb-6">
                      <div className="p-2.5 bg-sky-50 border-2 border-sky-100 rounded-2xl text-sky-600">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sky-950 text-base uppercase tracking-tight">Elenco Gare Fase a Gironi (Cronologico)</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          Incontri ordinati per data e ora di gioco, alternando i gironi per ottimizzare lo svolgimento
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {(() => {
                        const sortedGroupMatches = [...groupMatches].sort((a, b) => {
                          if (a.time !== b.time) {
                            return a.time.localeCompare(b.time);
                          }
                          return a.court.localeCompare(b.court);
                        });

                        if (sortedGroupMatches.length === 0) {
                          return (
                            <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                              Nessuna partita da mostrare. Configura e genera il torneo.
                            </div>
                          );
                        }

                        return sortedGroupMatches.map((match) => renderStandardMatchCard(match, `chrono-card-${match.id}`));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PHASE 2: ELIMINAZIONE DIRETTA (PLAYOFF BRACKET) VIEW */
            <div id="playoff-phase-view" className="space-y-6">
              {/* Toggle Mode: Tabellone Visivo / Elenco Gare (2-line unified layout) */}
              <div className="flex justify-center items-stretch gap-4 bg-slate-100 p-1.5 rounded-3xl w-full max-w-sm mx-auto border-2 border-slate-200 shadow-inner">
                <button
                  type="button"
                  id="toggle-view-visual"
                  onClick={() => setViewMode('visual')}
                  className={`flex-1 py-1 px-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                    viewMode === 'visual'
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="flex flex-col items-center leading-tight">
                    <span>Tabellone</span>
                    <span>Visivo</span>
                  </span>
                </button>
                <button
                  type="button"
                  id="toggle-view-cards"
                  onClick={() => setViewMode('cards')}
                  className={`flex-1 py-1 px-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ListFilter className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="flex flex-col items-center leading-tight">
                    <span>Elenco</span>
                    <span>Gare</span>
                  </span>
                </button>
              </div>
              {/* VIEW: VISUAL BRACKET FLOW */}
              {viewMode === 'visual' && (
                <div id="visual-bracket-container" className="space-y-2">
                  <div className="flex items-center gap-1.5 justify-center md:hidden bg-sky-50 border border-sky-200 py-2 px-3 rounded-2xl text-[10.5px] font-black uppercase text-sky-800 tracking-wider">
                    <span>👉 Scorri lateralmente per vedere tutti i turni del torneo</span>
                  </div>
                  <div className="overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
                    <div className="min-w-[800px] flex gap-8 items-stretch pt-4 select-none">
                    {Object.keys(roundsMap).map((roundKey) => {
                      const rNum = Number(roundKey);
                      const roundMatches = roundsMap[rNum] || [];
                      const label = getRoundDisplayLabel(rNum, roundMatches);

                      return (
                        <div key={rNum} className="flex-1 flex flex-col justify-around space-y-6">
                          <div className="text-center pb-2 border-b border-gray-100">
                            <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                              {label}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col justify-around py-4">
                            {roundMatches.map((match) => {
                              const isLive = match.status === 'live';
                              const isCompleted = match.status === 'completed';
                              const t1Winner = isCompleted && match.winnerId === match.team1?.id;
                              const t2Winner = isCompleted && match.winnerId === match.team2?.id;

                              return (
                                <div
                                  key={match.id}
                                  id={`visual-match-${match.id}`}
                                  className="relative my-4"
                                >
                                  <div
                                    className={`rounded-2xl border-4 p-3 bg-white w-full max-w-[240px] mx-auto transition-all shadow-md ${
                                      isLive
                                        ? 'border-orange-400 bg-orange-55/50 scale-105'
                                        : isCompleted
                                          ? 'border-emerald-300 bg-emerald-50/10'
                                          : 'border-sky-200 hover:border-sky-400 hover:shadow-lg'
                                    }`}
                                  >
                                    {/* Round label indicator badge */}
                                    <div className="mb-2 flex justify-between items-center text-[10px] font-bold">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        match.roundLabel.includes('Vincenti')
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                                          : match.roundLabel.includes('Perdenti')
                                            ? 'bg-rose-100 text-rose-800 border border-rose-250'
                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-250'
                                      }`}>
                                        {match.roundLabel}
                                      </span>
                                      <span className="text-[10px] bg-slate-800 text-white font-black px-2.5 py-1 rounded uppercase shadow-sm">
                                        Gara {garaNumbersMap[match.id] || '?'}
                                      </span>
                                    </div>

                                    {/* Match time & court */}
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 mb-2 border-b-2 border-slate-100 pb-1.5">
                                      <span className="flex items-center gap-1 text-slate-500">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        {match.time}
                                      </span>
                                      <span className="font-extrabold text-sky-600 bg-sky-50 px-1.5 rounded">{match.court}</span>
                                    </div>

                                    {/* Team 1 */}
                                    <div className={`flex items-center justify-between py-1 px-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      t1Winner ? 'bg-orange-100 text-slate-900 border border-orange-200' : 'text-slate-800'
                                    }`}>
                                      <div className="truncate flex-1 pr-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                        <span id={`bracket-t1-${match.id}`} className={match.team1 ? '' : 'text-slate-400 italic font-medium'}>
                                          {match.team1 ? match.team1.name : 'Da definire'}
                                        </span>
                                      </div>
                                      <span id={`bracket-t1-score-${match.id}`} className={`font-mono text-xs px-1 ${t1Winner ? 'text-orange-600 font-black' : 'text-slate-500'}`}>
                                        {isCompleted ? match.team1Score : (isLive ? simPointsT1 : 0)}
                                      </span>
                                    </div>

                                    {/* Team 2 */}
                                    <div className={`flex items-center justify-between py-1 px-1.5 rounded-lg text-xs font-bold mt-1.5 transition-colors ${
                                      t2Winner ? 'bg-orange-100 text-slate-900 border border-orange-200' : 'text-slate-800'
                                    }`}>
                                      <div className="truncate flex-1 pr-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        <span id={`bracket-t2-${match.id}`} className={match.team2 ? '' : 'text-slate-400 italic font-medium'}>
                                          {match.team2 ? match.team2.name : 'Da definire'}
                                        </span>
                                      </div>
                                      <span id={`bracket-t2-score-${match.id}`} className={`font-mono text-xs px-1 ${t2Winner ? 'text-orange-600 font-black' : 'text-slate-500'}`}>
                                        {isCompleted ? match.team2Score : (isLive ? simPointsT2 : 0)}
                                      </span>
                                    </div>

                                    {/* Scoring sets inline indicators */}
                                    {isCompleted && match.sets.length > 0 && (
                                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[9px] text-slate-405 font-black uppercase">
                                        <span>Sets:</span>
                                        {match.sets.map((s, idx) => (
                                          <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 rounded font-bold">
                                            {s.team1}-{s.team2}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {isCompleted && match.outcomeType && match.outcomeType !== 'normal' && (
                                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase">
                                        <span className="text-rose-600">Gara non disp:</span>
                                        <span className="bg-rose-500 text-white px-1 py-0.5 rounded font-black text-[7px] tracking-wider">
                                          {match.outcomeType === 'forfeit' ? 'ASSENTE / RINUNCIA' : match.outcomeType === 'injury_before' ? 'A TAVOLINO' : 'INFORTUNIO'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Quick actions on hover */}
                                    {match.team1 && match.team2 && !isCompleted && !isLive && canWrite && (
                                      <div className="mt-3 pt-2 border-t border-slate-100 flex gap-1 justify-end">
                                        <button
                                          id={`action-live-${match.id}`}
                                          disabled={!!liveSimulatingMatchId}
                                          onClick={() => startLiveSimulation(match)}
                                          className="p-1 px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider border-b-2 border-emerald-700 disabled:opacity-50"
                                          title="Simula Match Live"
                                        >
                                          LIVE
                                        </button>
                                        <button
                                          id={`action-score-${match.id}`}
                                          onClick={() => openEditModal(match)}
                                          className="p-1 px-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded text-[9px] font-black uppercase tracking-wider border-b-2 border-sky-700"
                                          title="Punteggio Manuale"
                                        >
                                          SCORE
                                        </button>
                                        <button
                                          id={`action-fast-${match.id}`}
                                          onClick={() => handleQuickPlayAllMatch(match)}
                                          className="p-1 px-1.5 bg-orange-400 hover:bg-orange-500 text-white rounded text-[9px] font-black uppercase tracking-wider border-b-2 border-orange-600"
                                          title="Automatica Istantanea"
                                        >
                                          FAST
                                        </button>
                                      </div>
                                    )}

                                    {/* Modifica score se completato */}
                                    {match.team1 && match.team2 && isCompleted && !isLive && canWrite && (
                                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                        <button
                                          id={`action-score-completed-${match.id}`}
                                          onClick={() => openEditModal(match)}
                                          className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[9px] font-black uppercase tracking-wider border border-slate-250 flex items-center gap-1 shadow-xs transition-all active:translate-y-0.5"
                                          title="Modifica Punteggio"
                                        >
                                          <Edit2 className="w-2.5 h-2.5 text-slate-600" />
                                          SCORE
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}

              {/* VIEW: LIST/CARDS OF ALL MATCHES */}
              {viewMode === 'cards' && (
                <div id="cards-bracket-layout" className="space-y-6">
                  {/* Round Selector Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-1.5 pt-1">
                    {Object.keys(roundsMap).map((roundKey) => {
                      const rNum = Number(roundKey);
                      const roundLabel = getRoundDisplayLabel(rNum, roundsMap[rNum] || []);
                      return (
                        <button
                          key={rNum}
                          id={`tab-select-round-${rNum}`}
                          onClick={() => setSelectedRoundTab(rNum)}
                          className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-full whitespace-nowrap transition-all border-2 ${
                            selectedRoundTab === rNum
                              ? 'bg-orange-400 border-orange-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {roundLabel}
                        </button>
                      );
                    })}
                  </div>

                  {/* Roster of select round matches */}
                  <div id="selected-round-matches-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(roundsMap[selectedRoundTab] || []).map((match) => renderStandardMatchCard(match, `detailed-card-${match.id}`))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Manual Score Dialog popup */}
      {editingMatch && (
        <div id="manual-score-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border-4 border-orange-300 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-400 p-5 text-white border-b-4 border-orange-600 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-black text-xl italic uppercase tracking-tight flex items-center gap-1.5">
                  <Trophy className="w-5 h-5 text-yellow-250 animate-bounce" />
                  Risultati ed Orari Gara
                </h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mt-0.5">Gestione ed Allineamento Punteggi</p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingMatch(null)}
                className="text-white hover:text-orange-100 font-extrabold text-2xl p-1 px-2.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                title="Chiudi"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Content Box */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Informative Help Banner */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl text-slate-700 text-xs font-semibold leading-relaxed flex gap-2.5 items-start">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">Regola di Inserimento</p>
                  Inserisci i punti parziali per ciascuno dei set giocati. Per effettuare la validazione, controlla e conferma il <span className="underline font-bold">Risultato Finale Set</span> in fondo prima di salvare.
                </div>
              </div>

              {/* Match Calendar/Court scheduling */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-court-input" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Campo di Gioco</label>
                  <input
                    id="edit-court-input"
                    type="text"
                    className="w-full px-3 py-2 border-2 border-slate-250 bg-white font-extrabold text-slate-800 rounded-xl text-xs focus:outline-none focus:border-orange-400"
                    value={editCourt}
                    onChange={(e) => setEditCourt(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-time-input" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Orario Incontro</label>
                  <input
                    id="edit-time-input"
                    type="text"
                    className="w-full px-3 py-2 border-2 border-slate-250 bg-white font-extrabold text-slate-800 rounded-xl text-xs focus:outline-none focus:border-orange-400"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </div>
              </div>

              {/* FIPAV Match Termination Type Selector */}
              <div className="bg-orange-50/45 p-4 rounded-3xl border-2 border-orange-200 space-y-3">
                <div>
                  <label htmlFor="termination-type-select" className="block text-[10px] font-black text-orange-900 uppercase tracking-wider mb-1 font-sans">
                    Modalità Conclusione Gara (FIPAV)
                  </label>
                  <select
                    id="termination-type-select"
                    className="w-full px-3 py-2 border-2 border-orange-200 bg-white font-black text-slate-800 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    value={outcomeType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setOutcomeType(val);
                      if (val === 'normal') {
                        setRetiredTeamId('');
                      } else if (!retiredTeamId) {
                        setRetiredTeamId(editingMatch.team1?.id || '');
                      }
                    }}
                  >
                    <option value="normal">Incontro Regolare (Terminato sul campo)</option>
                    <option value="injury_during">Infortunio in corso di gara (Regola "a")</option>
                    <option value="injury_before">Infortunio prima d'iniziare (Regola "b")</option>
                    <option value="forfeit">Rinuncia o Assenza (Regola "c" - Forfeit)</option>
                  </select>
                </div>

                {outcomeType !== 'normal' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-orange-200"
                  >
                    <label htmlFor="retired-team-select" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      {outcomeType === 'forfeit' ? 'Squadra Assente / Rinunciataria' : 'Squadra Ritirata / Infortunata'}
                    </label>
                    <select
                      id="retired-team-select"
                      className="w-full px-2.5 py-2 border border-slate-200 bg-white font-bold text-xs rounded-xl text-slate-800 focus:outline-none"
                      value={retiredTeamId}
                      onChange={(e) => setRetiredTeamId(e.target.value)}
                    >
                      {editingMatch.team1 && <option value={editingMatch.team1.id}>{editingMatch.team1.name}</option>}
                      {editingMatch.team2 && <option value={editingMatch.team2.id}>{editingMatch.team2.name}</option>}
                    </select>
                    <p className="text-[10px] text-slate-400 font-extrabold italic mt-1 leading-normal uppercase">
                      {outcomeType === 'injury_during' && "Regola a): I parziali acquisiti rimangono validi. La gara viene completata assegnando alla squadra superstite i set mancanti per la vittoria."}
                      {outcomeType === 'injury_before' && "Regola b): Vittoria a tavolino alla squadra superstite (2 set). Squadra ritirata ottiene 1 punto in classifica."}
                      {outcomeType === 'forfeit' && "Regola c): Rinuncia. Vittoria a tavolino 2-0 (o 1-0). Squadra rinunciataria riceve 0 punti in classifica."}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Set Scores inputs Section */}
              {(() => {
                const matchPointsPerSet = editingMatch.pointsPerSet || 21;
                const matchMaxSets = editingMatch.maxSets || 3;
                
                // Live stats computed directly
                let computedT1 = 0;
                let computedT2 = 0;
                if (t1Set1 > 0 || t2Set1 > 0) {
                  if (t1Set1 > t2Set1) computedT1++;
                  else if (t2Set1 > t1Set1) computedT2++;
                }
                if (matchMaxSets === 3 && (t1Set2 > 0 || t2Set2 > 0)) {
                  if (t1Set2 > t2Set2) computedT1++;
                  else if (t2Set2 > t1Set2) computedT2++;
                }
                if (matchMaxSets === 3 && (t1Set3 > 0 || t2Set3 > 0)) {
                  if (t1Set3 > t2Set3) computedT1++;
                  else if (t2Set3 > t1Set3) computedT2++;
                }
                
                const isSync = (manualT1Sets === computedT1) && (manualT2Sets === computedT2);

                return (
                  <>
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Punteggi Parziali Set</h5>
                    
                    {outcomeType === 'injury_before' || outcomeType === 'forfeit' ? (
                      <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-200 text-center text-slate-400 font-extrabold text-xs space-y-1 my-4">
                        <p className="uppercase text-orange-500 font-black tracking-wider text-sm">Nessun Set Giocato</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                          La vittoria viene assegnata d'ufficio per {matchMaxSets === 1 ? '1-0' : '2-0'} e non sono calcolati i singoli set points sul campo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* SET 1 CARD */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Set 1 ({matchPointsPerSet} Pt)</span>
                          {(t1Set1 > 0 || t2Set1 > 0) && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">
                              {t1Set1 > t2Set1 ? editingMatch.team1?.name : editingMatch.team2?.name} vince set
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                          {/* TEAM 1 INPUT */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-600 block truncate">{editingMatch.team1?.name}</span>
                            <input
                              id="t1-set1-input"
                              type="number"
                              min="0"
                              placeholder="0"
                              className="w-full text-center px-3 py-2 border-2 border-slate-250 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 focus:bg-orange-50/10"
                              value={t1Set1 === 0 ? '' : t1Set1}
                              onChange={(e) => setT1Set1(e.target.value === '' ? 0 : Number(e.target.value))}
                            />
                          </div>
                          {/* TEAM 2 INPUT */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-600 block truncate text-right">{editingMatch.team2?.name}</span>
                            <input
                              id="t2-set1-input"
                              type="number"
                              min="0"
                              placeholder="0"
                              className="w-full text-center px-3 py-2 border-2 border-slate-250 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 focus:bg-orange-50/10"
                              value={t2Set1 === 0 ? '' : t2Set1}
                              onChange={(e) => setT2Set1(e.target.value === '' ? 0 : Number(e.target.value))}
                            />
                          </div>
                        </div>
                        {set1Error && (
                          <div className="mt-2.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-2 px-3 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{set1Error}</span>
                          </div>
                        )}
                      </div>

                      {/* SET 2 CARD */}
                      {matchMaxSets === 3 && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Set 2 ({matchPointsPerSet} Pt)</span>
                            {(t1Set2 > 0 || t2Set2 > 0) && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">
                                {t1Set2 > t2Set2 ? editingMatch.team1?.name : editingMatch.team2?.name} vince set
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 items-center">
                            {/* TEAM 1 INPUT */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-600 block truncate">{editingMatch.team1?.name}</span>
                              <input
                                id="t1-set2-input"
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full text-center px-3 py-2 border-2 border-slate-250 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 focus:bg-orange-50/10"
                                value={t1Set2 === 0 ? '' : t1Set2}
                                onChange={(e) => setT1Set2(e.target.value === '' ? 0 : Number(e.target.value))}
                              />
                            </div>
                            {/* TEAM 2 INPUT */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-600 block truncate text-right">{editingMatch.team2?.name}</span>
                              <input
                                id="t2-set2-input"
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full text-center px-3 py-2 border-2 border-slate-250 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 focus:bg-orange-50/10"
                                value={t2Set2 === 0 ? '' : t2Set2}
                                onChange={(e) => setT2Set2(e.target.value === '' ? 0 : Number(e.target.value))}
                              />
                            </div>
                          </div>
                          {set2Error && (
                            <div className="mt-2.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-2 px-3 flex items-center gap-1.5 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{set2Error}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TIEBREAK SET 3 CARD */}
                      {matchMaxSets === 3 && (
                        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 shadow-xs relative overflow-hidden">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block text-center">Set 3 - Eventuale Tie-Break (15 Pt)</span>
                            {(t1Set3 > 0 || t2Set3 > 0) && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                {t1Set3 > t2Set3 ? editingMatch.team1?.name : editingMatch.team2?.name} vince set
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 items-center">
                            {/* TEAM 1 INPUT */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-amber-950 block truncate">{editingMatch.team1?.name}</span>
                              <input
                                id="t1-set3-input"
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full text-center px-3 py-2 border-2 border-amber-200 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 bg-white"
                                value={t1Set3 === 0 ? '' : t1Set3}
                                onChange={(e) => setT1Set3(e.target.value === '' ? 0 : Number(e.target.value))}
                              />
                            </div>
                            {/* TEAM 2 INPUT */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-amber-950 block truncate text-right">{editingMatch.team2?.name}</span>
                              <input
                                id="t2-set3-input"
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full text-center px-3 py-2 border-2 border-amber-200 rounded-xl font-bold font-mono text-base focus:outline-none focus:border-orange-400 bg-white"
                                value={t2Set3 === 0 ? '' : t2Set3}
                                onChange={(e) => setT2Set3(e.target.value === '' ? 0 : Number(e.target.value))}
                              />
                            </div>
                          </div>
                          {set3Error && (
                            <div className="mt-2.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-2 px-3 flex items-center gap-1.5 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{set3Error}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                    {/* VERIFICATION AND MANUAL INTERACTIVE SET CONTROLLER */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3.5">
                        <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                          <Info className="w-4 h-4 text-sky-500 shrink-0" />
                          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                            Risultato Finale SET (per Verifica)
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* TEAM 1 MANUAL SETS */}
                          <div className="space-y-1.5 text-center">
                            <span className="text-[10px] font-extrabold text-slate-500 truncate block uppercase">
                              Set Vinti {editingMatch.team1?.name}
                            </span>
                            <div className="flex justify-center gap-1 bg-white p-1 rounded-xl border-2 border-slate-200">
                              {[0, 1, 2].filter(num => matchMaxSets === 3 ? true : num <= 1).map((num) => (
                                <button
                                  key={`t1-sets-${num}`}
                                  type="button"
                                  onClick={() => setManualT1Sets(num)}
                                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                    manualT1Sets === num
                                      ? 'bg-orange-500 text-white shadow-sm scale-105'
                                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* TEAM 2 MANUAL SETS */}
                          <div className="space-y-1.5 text-center">
                            <span className="text-[10px] font-extrabold text-slate-500 truncate block uppercase">
                              Set Vinti {editingMatch.team2?.name}
                            </span>
                            <div className="flex justify-center gap-1 bg-white p-1 rounded-xl border-2 border-slate-200">
                              {[0, 1, 2].filter(num => matchMaxSets === 3 ? true : num <= 1).map((num) => (
                                <button
                                  key={`t2-sets-${num}`}
                                  type="button"
                                  onClick={() => setManualT2Sets(num)}
                                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                    manualT2Sets === num
                                      ? 'bg-orange-500 text-white shadow-sm scale-105'
                                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Live Verification Indicator Banner */}
                        <div className={`p-3 rounded-xl text-center text-[11px] font-extrabold transition-all duration-150 ${
                          isSync 
                            ? 'bg-emerald-50 border border-emerald-250 text-emerald-700' 
                            : 'bg-amber-100/70 border border-amber-250 text-amber-800'
                        }`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              {isSync ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Verifica OK: I parziali coincidono con il risultato dei set ({computedT1} - {computedT2})</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                                  <span>
                                    Discrepanza: Parziali ({computedT1}-{computedT2}) ≠ Risultato SET ({manualT1Sets}-{manualT2Sets})
                                  </span>
                                </>
                              )}
                            </span>
                            {!isSync && (
                              <button
                                type="button"
                                onClick={() => {
                                  setManualT1Sets(computedT1);
                                  setManualT2Sets(computedT2);
                                }}
                                className="text-[10px] font-black uppercase text-amber-800 bg-white hover:bg-amber-50 border border-amber-250 px-2 py-1 rounded-lg transition-all shadow-xs flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-700 animate-spin-slow" />
                                Allinea ai parziali
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex flex-col sm:flex-row gap-2.5 shrink-0">
              <button
                type="button"
                id="cancel-score-btn"
                onClick={() => setEditingMatch(null)}
                className="flex-1 bg-slate-100 border-2 border-slate-200 text-slate-500 hover:bg-slate-200 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                id="save-schedule-only-btn"
                onClick={handleSaveScheduleOnly}
                className="flex-1 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-sky-700 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:translate-y-0.5 shadow-sm transition-all font-sans"
              >
                <Clock className="w-4 h-4 text-sky-600 stroke-[2.5]" />
                Salva Solo Ora/Campo
              </button>
              <button
                type="button"
                id="save-score-btn"
                onClick={handleSaveScoreManual}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-4 border-orange-700 active:translate-y-0.5 shadow-md transition-all font-sans"
              >
                <Save className="w-4 h-4 text-white stroke-[2.5]" />
                Salva Risultati
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Conflict Resolution Modal */}
      {conflictData && (
        <div id="conflict-resolution-modal" className="fixed inset-0 z-55 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border-4 border-amber-400 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white border-b-4 border-amber-600 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-black text-lg italic uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-yellow-100 animate-pulse" />
                  Rilevato Conflitto Orario/Campo!
                </h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-100 mt-0.5">Gestione Sovrapposizioni Gare</p>
              </div>
              <button 
                type="button" 
                onClick={() => setConflictData(null)}
                className="text-white hover:text-amber-100 font-extrabold text-2xl p-1 px-2.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                title="Chiudi"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] bg-slate-50">
              
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-slate-700 text-xs font-semibold leading-relaxed">
                <p className="font-bold text-amber-950 text-[11px] uppercase tracking-wider mb-1">Dettaglio Sovrapposizione</p>
                Hai selezionato il <span className="font-black text-amber-900">{conflictData.newCourt}</span> alle <span className="font-black text-amber-900">{conflictData.newTime}</span>. In questa fascia oraria il campo è già occupato da un'altra gara. Scegli come risolvere il conflitto:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Proposed/Target Match */}
                <div className="bg-white p-4 rounded-2xl border-2 border-sky-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-sky-100 text-sky-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Gara Spostata</span>
                    <span className="text-slate-400 font-mono text-[10px]">Durata: {getSingleMatchDuration(conflictData.targetMatch.pointsPerSet, conflictData.targetMatch.maxSets)} min</span>
                  </div>
                  <div className="font-black text-xs text-slate-800 leading-tight">
                    {conflictData.targetMatch.team1?.name} vs {conflictData.targetMatch.team2?.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold space-y-0.5">
                    <p>Fase: <span className="uppercase text-slate-700">{conflictData.targetMatch.phase}</span></p>
                    <p className="text-sky-600 font-black">Nuovo Orario: {conflictData.newTime} ({conflictData.newCourt})</p>
                    <p className="text-slate-400 font-normal">Originale: {conflictData.targetMatch.time} ({conflictData.targetMatch.court})</p>
                  </div>
                </div>

                {/* Conflicting Match */}
                <div className="bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-nowrap">Gara in Conflitto</span>
                    <span className="text-slate-400 font-mono text-[10px]">Durata: {getSingleMatchDuration(conflictData.conflictingMatch.pointsPerSet, conflictData.conflictingMatch.maxSets)} min</span>
                  </div>
                  <div className="font-black text-xs text-slate-800 leading-tight">
                    {conflictData.conflictingMatch.team1?.name} vs {conflictData.conflictingMatch.team2?.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold space-y-0.5">
                    <p>Fase: <span className="uppercase text-slate-700">{conflictData.conflictingMatch.phase}</span></p>
                    <p className="text-amber-600 font-black">Orario programmato: {conflictData.conflictingMatch.time} ({conflictData.conflictingMatch.court})</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer (Controls) */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
              
              <button
                type="button"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all border-b-4 border-sky-700"
                onClick={() => resolveConflictWithShift(conflictData.targetMatch.id, conflictData.newCourt, conflictData.newTime, conflictData.scoreData)}
              >
                <Clock className="w-4 h-4 stroke-[2.5]" />
                1. Slitta questa gara e tutte le successive
              </button>

              <button
                type="button"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all border-b-4 border-amber-700"
                onClick={() => resolveConflictWithInversion(conflictData.targetMatch.id, conflictData.conflictingMatch.id, conflictData.scoreData)}
              >
                <Shuffle className="w-4 h-4 stroke-[2.5]" />
                2. Inverti orari delle due gare
              </button>

              <button
                type="button"
                className="w-full bg-slate-100 border-2 border-slate-200 text-slate-700 hover:bg-slate-200 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all text-center"
                onClick={() => setConflictData(null)}
              >
                3. Annulla e Risolvi Manualmente
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Resetting Tournament */}
      {showResetConfirmModal && (
        <div id="reset-confirm-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border-4 border-rose-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-500 to-red-500 p-5 text-white border-b-4 border-rose-600 text-center">
              <h4 className="font-black text-lg italic uppercase tracking-tight">Attenzione! Azzera Gara</h4>
              <p className="text-xs font-bold text-white/90 uppercase tracking-widest mt-1">Questa azione è irreversibile</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                Vuoi davvero svuotare il tabellone delle partite, azzerare tutti i risultati salvati e riconfigurare la formula del torneo?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-reset-btn"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="flex-1 bg-slate-100 border-2 border-slate-200 text-slate-500 hover:bg-slate-200 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all"
                >
                  Annulla
                </button>
                <button
                  id="confirm-reset-btn"
                  onClick={() => {
                    onUpdateMatches([]);
                    setShowResetConfirmModal(false);
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-full text-xs font-black uppercase tracking-wider border-b-4 border-rose-700 active:translate-y-0.5 transition-all shadow-md"
                >
                  Sì, Azzera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Custom Alert Message Dialog */}
      {alertMessage && (
        <div id="alert-message-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border-4 border-amber-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-5 text-white border-b-4 border-amber-500 text-center">
              <h4 className="font-black text-lg italic uppercase tracking-tight">Attenzione</h4>
              <p className="text-xs font-bold text-white/90 uppercase tracking-widest mt-1">Avviso Torneo</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                {alertMessage}
              </p>
              <div className="pt-2">
                <button
                  id="close-alert-btn"
                  onClick={() => setAlertMessage(null)}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-white py-2.5 rounded-full text-xs font-black uppercase tracking-wider border-b-4 border-amber-600 active:translate-y-0.5 transition-all shadow-md"
                >
                  OK, Ho Capito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
