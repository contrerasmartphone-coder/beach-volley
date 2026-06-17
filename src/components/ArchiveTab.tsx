import React, { useState } from 'react';
import { Team, Match, ArchivedTournament, AppUser, ActiveTournamentSave } from '../types';
import { db, handleFirestoreError, OperationType, cleanObject } from '../firebase';
import { getGaraNumbersMap, computeFipavStandings } from '../utils';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FileText, Download, Printer, Trash2, Archive, Trophy, Calendar, Award, Eye, EyeOff, FileSpreadsheet, ChevronDown, ChevronUp, Save, Undo, AlertTriangle, RefreshCw, Plus } from 'lucide-react';

interface ArchiveTabProps {
  currentUser: AppUser | null;
  archives: ArchivedTournament[];
  saves?: ActiveTournamentSave[];
  activeTeams: Team[];
  activeMatches: Match[];
  activeTournamentConfig: any;
  loadedSaveName?: string | null;
  onClearActiveTournament: () => Promise<void>;
  onSaveActiveTournament: (name: string, overwriteId?: string) => Promise<void>;
  onRestoreTournament: (save: ActiveTournamentSave) => Promise<void>;
  onDeleteSave: (id: string) => Promise<void>;
}

export default function ArchiveTab({
  currentUser,
  archives,
  saves = [],
  activeTeams,
  activeMatches,
  activeTournamentConfig,
  loadedSaveName = null,
  onClearActiveTournament,
  onSaveActiveTournament,
  onRestoreTournament,
  onDeleteSave,
}: ArchiveTabProps) {
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState('');
  const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);
  
  // States for dynamic in-progress tournament saves
  const [subTab, setSubTab] = useState<'historical' | 'in_progress'>('historical');
  const [isSavingActiveModalOpen, setIsSavingActiveModalOpen] = useState(false);
  const [activeSaveName, setActiveSaveName] = useState('');
  const [conflictSave, setConflictSave] = useState<ActiveTournamentSave | null>(null);
  
  // Custom confirmation states to replace window.confirm (for sandbox iframe compatibility)
  const [deleteArchiveId, setDeleteArchiveId] = useState<string | null>(null);
  const [restoreSaveObj, setRestoreSaveObj] = useState<ActiveTournamentSave | null>(null);
  const [deleteSaveId, setDeleteSaveId] = useState<string | null>(null);
  
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);

  const canWrite = currentUser && (currentUser.role === 'admin' || currentUser.role === 'collaborator');
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Determine top 3 for the podium
  const getPodium = (): { first: Team | null; second: Team | null; third: Team | null } => {
    if (!activeMatches || activeMatches.length === 0) {
      return { first: null, second: null, third: null };
    }
    
    // Sort teams by standings first as fallback
    const standsMatches = activeTournamentConfig?.formula === 'combined' 
      ? activeMatches.filter(m => m.phase === 'gironi') 
      : activeMatches;
    const sortedTeams = computeFipavStandings(activeTeams, standsMatches);

    const grandFinal = activeMatches.find(m => m.roundLabel === 'Finale' && (m.phase === 'eliminazione' || m.id.includes('de') || m.id.startsWith('m-p-')));
    const final3rd = activeMatches.find(m => m.roundLabel === 'Finale 3°/4° Posto');
    const formula = activeTournamentConfig?.formula;
    const isPlayoffTourney = formula && formula !== 'pools';

    let first: Team | null = null;
    let second: Team | null = null;
    let third: Team | null = null;

    if (isPlayoffTourney) {
      if (grandFinal && grandFinal.status === 'completed' && grandFinal.winnerId) {
        const winnerId = grandFinal.winnerId;
        const loserId = winnerId === grandFinal.team1?.id ? grandFinal.team2?.id : grandFinal.team1?.id;
        first = activeTeams.find(t => t.id === winnerId) || null;
        second = loserId ? (activeTeams.find(t => t.id === loserId) || null) : null;
      }

      if (final3rd && final3rd.status === 'completed' && final3rd.winnerId) {
        third = activeTeams.find(t => t.id === final3rd.winnerId) || null;
      } else if (formula === 'double_elim') {
        const match10 = activeMatches.find(m => m.id === 'm-de-10');
        if (match10 && match10.status === 'completed') {
          const loserId = match10.winnerId === match10.team1?.id ? match10.team2?.id : match10.team1?.id;
          third = loserId ? (activeTeams.find(t => t.id === loserId) || null) : null;
        }
      }
    }

    const list: Team[] = [];
    if (first) list.push(first);
    if (second) list.push(second);
    if (third) list.push(third);

    const remaining = sortedTeams.filter(t => !list.some(lt => lt.id === t.id));
    
    const finalFirst = first || remaining.shift() || sortedTeams[0] || null;
    const finalSecond = second || remaining.shift() || sortedTeams[1] || null;
    const finalThird = third || remaining.shift() || sortedTeams[2] || null;

    return { first: finalFirst, second: finalSecond, third: finalThird };
  };

  // Determine potential winner of current tournament
  const getPotentialWinner = (): string => {
    const podiumData = getPodium();
    if (podiumData.first) return podiumData.first.name;
    return 'Non definito';
  };

  // Archive current tournament
  const handleArchiveCurrent = async () => {
    if (activeMatches.length === 0) return;
    const nameToUse = archiveName.trim() || activeTournamentConfig?.name || `Capionato del ${new Date().toLocaleDateString()}`;
    const podiumData = getPodium();
    
    const newArchive: ArchivedTournament = {
      id: `archive-${Date.now()}`,
      name: nameToUse,
      date: new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      formula: activeTournamentConfig?.formula || 'N/A',
      teamsCount: activeTeams.length,
      // "lista d'ingresso" contains clean team list details as per registration (without current temporary match dev stats)
      teams: activeTeams.map(t => ({
        id: t.id,
        name: t.name,
        player1: t.player1,
        player2: t.player2,
        level: t.level,
        phone: t.phone,
        email: t.email,
        phone2: t.phone2 || '',
        email2: t.email2 || '',
        registeredAt: t.registeredAt,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        points: 0,
      })),
      winnerTeamName: podiumData.first?.name || 'N/A',
      podium: podiumData,
    };

    try {
      await setDoc(doc(db, 'archives', newArchive.id), cleanObject(newArchive));
      setIsSuccessMessage(`Torneo "${nameToUse}" archiviato con successo nell'archivio storico! 🏅`);
      setIsArchivingModalOpen(false);
      setArchiveName('');
      setTimeout(() => setIsSuccessMessage(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `archives/${newArchive.id}`);
    }
  };

  const handleSaveActiveSubmit = async () => {
    const nameToUse = activeSaveName.trim() || activeTournamentConfig?.name || `Torneo del ${new Date().toLocaleDateString()}`;
    const existing = saves.find(s => s.name.trim().toLowerCase() === nameToUse.trim().toLowerCase());
    
    if (existing) {
      setConflictSave(existing);
      return;
    }

    await onSaveActiveTournament(nameToUse);
    setIsSuccessMessage(`Torneo in corso "${nameToUse}" salvato correttamente! Potrai riprenderlo in qualsiasi momento. 💾`);
    setIsSavingActiveModalOpen(false);
    setActiveSaveName('');
    setTimeout(() => setIsSuccessMessage(null), 5000);
  };

  // Delete archive
  const handleDeleteArchive = (id: string) => {
    setDeleteArchiveId(id);
  };

  const confirmDeleteArchive = async () => {
    if (!deleteArchiveId) return;
    try {
      await deleteDoc(doc(db, 'archives', deleteArchiveId));
      setIsSuccessMessage(`Torneo archiviato eliminato con successo. 🗑️`);
      setTimeout(() => setIsSuccessMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `archives/${deleteArchiveId}`);
    } finally {
      setDeleteArchiveId(null);
    }
  };

  const confirmRestoreTournament = async () => {
    if (!restoreSaveObj) return;
    await onRestoreTournament(restoreSaveObj);
    setIsSuccessMessage(`Torneo "${restoreSaveObj.name}" caricato con successo! 🔄`);
    setTimeout(() => setIsSuccessMessage(null), 5000);
    setRestoreSaveObj(null);
  };

  const confirmDeleteSave = async () => {
    if (!deleteSaveId) return;
    await onDeleteSave(deleteSaveId);
    setIsSuccessMessage(`Salvataggio eliminato con successo. 🗑️`);
    setTimeout(() => setIsSuccessMessage(null), 4000);
    setDeleteSaveId(null);
  };

  // Export functions
  const convertTournamentToCSV = (arc: ArchivedTournament): string => {
    let csv = `ID Torneo,${arc.id}\n`;
    csv += `Nome Torneo,${arc.name}\n`;
    csv += `Data Archiviazione,${arc.date}\n`;
    csv += `Formula,${arc.formula.toUpperCase()}\n`;
    csv += `Squadre Partecipanti,${arc.teamsCount}\n`;
    csv += `Vincitore,${arc.winnerTeamName || 'N/A'}\n\n`;

    // Podium Section
    csv += `PODIO UFFICIALE\n`;
    csv += `Posizione,Squadra,Giocatori,Livello\n`;
    if (arc.podium) {
      if (arc.podium.first) csv += `1° Posto,"${arc.podium.first.name}","${arc.podium.first.player1} e ${arc.podium.first.player2}","${arc.podium.first.level}"\n`;
      if (arc.podium.second) csv += `2° Posto,"${arc.podium.second.name}","${arc.podium.second.player1} e ${arc.podium.second.player2}","${arc.podium.second.level}"\n`;
      if (arc.podium.third) csv += `3° Posto,"${arc.podium.third.name}","${arc.podium.third.player1} e ${arc.podium.third.player2}","${arc.podium.third.level}"\n`;
    } else {
      csv += `1° Posto,"${arc.winnerTeamName || 'N/A'}",-,- \n`;
    }
    csv += `\n`;

    // Entry List Section
    csv += `LISTA D'INGRESSO PARTECIPANTI\n`;
    csv += `Squadra,Atleta 1,Contatto 1,Atleta 2,Contatto 2,Livello,Registrato il\n`;
    arc.teams.forEach(t => {
      csv += `"${t.name}","${t.player1}","${t.email || t.phone || ''}","${t.player2}","${t.email2 || t.phone2 || ''}","${t.level}","${t.registeredAt}"\n`;
    });

    return csv;
  };

  const handleDownloadSingleCSV = (arc: ArchivedTournament) => {
    const csvContent = convertTournamentToCSV(arc);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Torneo_Archiviato_${arc.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllSummaryCSV = () => {
    if (archives.length === 0) return;
    let csv = `Nome Torneo,Data Archiviazione,Formula,Numero Squadre,Vincitore\n`;
    archives.forEach(arc => {
      csv += `"${arc.name}","${arc.date}","${arc.formula.toUpperCase()}",${arc.teamsCount},"${arc.winnerTeamName || 'N/A'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Archivio_Tornei_Aggiornato.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printing functions
  const handlePrintSingle = (arc: ArchivedTournament) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Abilita i popup nel browser.');
      return;
    }

    const podiumHTML = arc.podium ? `
      <div style="display: flex; justify-content: center; gap: 20px; text-align: center; margin-bottom: 40px; font-family: sans-serif; padding: 15px; background: #fffdf5; border: 2px solid #fef3c7; border-radius: 16px;">
        ${arc.podium.second ? `
          <div style="flex: 1; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
            <div style="font-size: 24px; margin-bottom: 5px;">🥈</div>
            <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; color: #1e293b;">${arc.podium.second.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${arc.podium.second.player1} / ${arc.podium.second.player2}</div>
            <div style="font-weight: 800; font-size: 11px; color: #475569; margin-top: 5px; background: #f1f5f9; padding: 2px 8px; border-radius: 10px;">2° CLASSIFICATO</div>
          </div>
        ` : ''}
        ${arc.podium.first ? `
          <div style="flex: 1.2; padding: 15px; background: #fffbeb; border: 2px solid #fde047; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; transform: scale(1.05); box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="font-size: 34px; margin-bottom: 5px;">🏆</div>
            <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; color: #78350f;">${arc.podium.first.name}</div>
            <div style="font-size: 12px; color: #b45309; margin-top: 3px; font-weight: 550;">${arc.podium.first.player1} / ${arc.podium.first.player2}</div>
            <div style="font-weight: 900; font-size: 11px; color: #ffffff; margin-top: 8px; background: #ea580c; padding: 3px 12px; border-radius: 10px; letter-spacing: 0.5px;">VINCITORE 🥇</div>
          </div>
        ` : `
          <div style="flex: 1.2; padding: 15px; background: #fffbeb; border: 2px solid #fde047; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
            <div style="font-size: 34px; margin-bottom: 5px;">🏆</div>
            <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; color: #78350f;">${arc.winnerTeamName || 'N/A'}</div>
            <div style="font-weight: 900; font-size: 11px; color: #ffffff; margin-top: 8px; background: #ea580c; padding: 3px 12px; border-radius: 10px; letter-spacing: 0.5px;">VINCITORE 🥇</div>
          </div>
        `}
        ${arc.podium.third ? `
          <div style="flex: 1; padding: 10px; background: #fdfbf7; border: 1px solid #f5e0c3; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
            <div style="font-size: 24px; margin-bottom: 5px;">🥉</div>
            <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; color: #7c2d12;">${arc.podium.third.name}</div>
            <div style="font-size: 11px; color: #9a3412; margin-top: 3px;">${arc.podium.third.player1} / ${arc.podium.third.player2}</div>
            <div style="font-weight: 800; font-size: 11px; color: #7c2d12; margin-top: 5px; background: #ffedd5; padding: 2px 8px; border-radius: 10px;">3° CLASSIFICATO</div>
          </div>
        ` : ''}
      </div>
    ` : `
      <div style="text-align: center; margin-bottom: 40px; font-family: sans-serif; padding: 20px; background: #fffbeb; border: 2px solid #fde047; border-radius: 16px;">
        <div style="font-size: 32px; margin-bottom: 5px;">🏆</div>
        <h3 style="color: #b45309; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campione del Torneo</h3>
        <p style="font-size: 24px; font-weight: 950; margin: 8px 0 0 0; color: #78350f; text-transform: uppercase;">${arc.winnerTeamName || 'N/A'}</p>
      </div>
    `;

    const teamsHTML = arc.teams.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 13px;">
        <td style="padding: 12px; font-weight: bold; text-align: left; color: #334155;">#${idx + 1}</td>
        <td style="padding: 12px; font-weight: 900; text-align: left; text-transform: uppercase; color: #0f172a;">${t.name}</td>
        <td style="padding: 12px; text-align: left; color: #475569;">${t.player1} & ${t.player2}</td>
        <td style="padding: 12px; font-weight: bold; text-align: center; color: #0284c7;">${t.level}</td>
        <td style="padding: 12px; text-align: center; color: #64748b; font-family: monospace; font-size: 11px;">${t.registeredAt || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Ufficiale Torneo Beach Volley: ${arc.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            h1 { color: #0284c7; text-transform: uppercase; font-size: 28px; border-bottom: 4px solid #0284c7; padding-bottom: 10px; margin-bottom: 30px; letter-spacing: -0.5px; }
            .info-box { display: flex; justify-content: space-between; background: #f0f9ff; border: 2px solid #bae6fd; padding: 20px; border-radius: 16px; margin-bottom: 30px; }
            .info-box p { margin: 6px 0; font-size: 13px; color: #0f172a; }
            .section-title { font-size: 16px; color: #0f172a; margin-top: 40px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f1f5f9; padding: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; color: #475569; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 12px; font-weight: 900; background: #ea580c; color: white; padding: 4px 12px; border-radius: 12px; text-transform: uppercase; tracking-widest;">REPARE UFFICIALE</span>
          </div>
          <h1 style="text-align: center; margin-bottom: 30px;">Beach Volley Cup • Archivio Storico</h1>
          
          <div class="info-box">
            <div>
              <p><strong>Nome Torneo:</strong> ${arc.name}</p>
              <p><strong>Formula di Gara:</strong> ${arc.formula.toUpperCase()}</p>
              <p><strong>Data Archiviazione:</strong> ${arc.date}</p>
              <p><strong>Squadre Partecipanti:</strong> ${arc.teamsCount}</p>
            </div>
          </div>

          <div class="section-title">🏆 Podio Ufficiale 🏆</div>
          ${podiumHTML}

          <div class="section-title">📋 Lista d'Ingresso Ufficiale (Partecipanti)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 8%;">Pos.</th>
                <th style="width: 32%;">Squadra</th>
                <th style="width: 35%;">Atleti</th>
                <th style="width: 12%; text-align: center;">Livello</th>
                <th style="width: 13%; text-align: center;">Registrato il</th>
              </tr>
            </thead>
            <tbody>
              ${teamsHTML}
            </tbody>
          </table>

          <footer style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            Beach Volley Hub - Report generato il ${new Date().toLocaleString()}
          </footer>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllSummary = () => {
    if (archives.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Abilita i popup nel browser.');
      return;
    }

    const rowsHTML = archives.map((arc, i) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px; font-weight: bold; text-align: left;">${i + 1}</td>
        <td style="padding: 12px; font-weight: bold; text-align: left; color: #0369a1;">${arc.name}</td>
        <td style="padding: 12px; text-align: left;">${arc.date}</td>
        <td style="padding: 12px; text-align: center; text-transform: uppercase;">${arc.formula}</td>
        <td style="padding: 12px; text-align: center; font-weight: bold;">${arc.teamsCount}</td>
        <td style="padding: 12px; text-align: left; font-weight: bold; color: #b45309;">🏆 ${arc.winnerTeamName || 'N/A'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Archivio Storico Tornei Beach Volley</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            h1 { color: #0f172a; border-bottom: 3px solid #0284c7; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; text-align: center; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #38bdf8; color: white; padding: 12px; text-align: left; text-transform: uppercase; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Archivio Storico Campionati Beach Volley</h1>
          <p style="text-align: center; color: #64748b; font-size: 13px; margin-bottom: 30px;">Summary list of all tournaments saved in the cloud repository</p>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: left;">#</th>
                <th style="width: 35%;">Nome Torneo</th>
                <th style="width: 25%;">Data Archiviazione</th>
                <th style="width: 10%; text-align: center;">Formula</th>
                <th style="width: 10%; text-align: center;">N. Squadre</th>
                <th style="width: 15%;">Campione</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <footer style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            Beach Volley Hub - Report Archivio generato il ${new Date().toLocaleString()}
          </footer>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="archives-parent-tab" className="space-y-6">
      
      {/* Success Notification Bar */}
      {isSuccessMessage && (
        <div id="archive-success-banner" className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-md animate-bounce flex items-center gap-3">
          <Trophy className="w-6 h-6 text-emerald-600 animate-spin shrink-0" />
          <span className="font-bold text-sm">{isSuccessMessage}</span>
        </div>
      )}

      {/* Active Tournament Action Card */}
      {(activeMatches.length > 0 || activeTeams.length > 0) && (
        <div id="active-tournament-archive-panel" className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-3xl p-6 text-white shadow-xl border-4 border-sky-300 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3.5 rounded-2xl shrink-0 border border-white/30 shadow-inner">
              <Archive className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight leading-none">
                {activeMatches.length > 0 ? 'Salva / Archivia Torneo' : 'Salva Torneo / Lista Iscritti'}
              </h3>
              <p className="text-xs text-sky-100 mt-2 font-bold uppercase tracking-wider">
                Fase Attiva: {activeTournamentConfig?.name || 'In Corso'} • {activeTeams.length} Squadre 
                {activeMatches.length > 0 ? (
                  <> • Campione Provvisorio: <span className="text-amber-300 font-extrabold">{getPotentialWinner()}</span></>
                ) : (
                  <> • <span className="text-amber-200 font-extrabold">Tabellone in attesa di generazione</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {canWrite ? (
              <div className="flex flex-col sm:flex-row gap-2">
                {activeMatches.length > 0 && (
                  <button
                    id="btn-trigger-archival-modal"
                    onClick={() => {
                      setArchiveName(activeTournamentConfig?.name || '');
                      setIsArchivingModalOpen(true);
                    }}
                    className="bg-white hover:bg-orange-50 text-sky-900 border-2 border-white scale-100 hover:scale-105 active:scale-95 py-2.5 px-4 font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Archivia Storico 🏅
                  </button>
                )}
                <button
                  id="btn-trigger-save-active-modal"
                  onClick={() => {
                    if (loadedSaveName) {
                      setActiveSaveName(loadedSaveName);
                    } else if (activeTournamentConfig?.name) {
                      setActiveSaveName(activeTournamentConfig.name);
                    } else {
                      setActiveSaveName('');
                    }
                    setIsSavingActiveModalOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white border-2 border-sky-450 scale-100 hover:scale-105 active:scale-95 py-2.5 px-4 font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-sky-200" />
                  Salva Torneo in Corso 💾
                </button>
              </div>
            ) : (
              <div className="text-[10px] bg-black/20 py-2 px-3 rounded-lg text-yellow-300 font-black tracking-wider uppercase max-w-[200px] text-center border border-yellow-400/30">
                ⚠️ ACCEDI COME ADMIN O COLLABORATORE PER GESTIRE IL TORNEO
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archiving Modal */}
      {isArchivingModalOpen && (
        <div id="archival-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="archival-modal-box" className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400">
            <h3 className="text-xl font-black text-sky-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
              <Archive className="w-5 h-5 text-orange-500" />
              Salva Torneo in Archivio
            </h3>
            
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Archiviando il torneo corrente, salverai in cloud tutte le partite giocate, i punteggi dei set, i partecipanti registrati e le statistiche finali del podio.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nome dell'Edizione / Archivio</label>
                <input
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  placeholder="E.g., Torneo d'Estate Beach Aces 2026"
                  className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 text-xs">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Campione Nazionale/Edizione:</span>
                  <span className="text-orange-650 font-black uppercase">{getPotentialWinner()}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Numero Squadre:</span>
                  <span className="text-slate-800 font-black">{activeTeams.length}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Data Archiviazione:</span>
                  <span className="text-slate-800 font-black">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                id="modal-btn-cancel-archival"
                onClick={() => setIsArchivingModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
              >
                Annulla
              </button>
              <button
                id="modal-btn-confirm-archival"
                onClick={handleArchiveCurrent}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700"
              >
                Archivia Ora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Active Dynamic Modal */}
      {isSavingActiveModalOpen && (
        <div id="save-active-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div id="save-active-modal-box" className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400 animate-in zoom-in-95 duration-200">
            {conflictSave ? (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-amber-600 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
                  Nome già utilizzato! ⚠️
                </h3>
                
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  Esiste già un salvataggio con il nome <strong className="text-slate-900 font-extrabold uppercase">"{conflictSave.name}"</strong>.
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Cosa desideri fare? Puoi sovrascrivere il salvataggio esistente oppure creare una copia come nuova versione indipendente.
                </p>

                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-800 space-y-1">
                  <div className="font-extrabold flex justify-between">
                    <span>Partita precedente salvata:</span>
                    <span>{conflictSave.teamsCount} Squadre</span>
                  </div>
                  <div className="text-[10px] text-amber-600 font-semibold">
                    Data: {conflictSave.date} • Formula: {conflictSave.formula.toUpperCase()}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    id="conflict-btn-overwrite"
                    onClick={async () => {
                      const nameToUse = activeSaveName.trim() || activeTournamentConfig?.name || `Torneo del ${new Date().toLocaleDateString()}`;
                      await onSaveActiveTournament(nameToUse, conflictSave.id);
                      setIsSuccessMessage(`Torneo "${nameToUse}" sovrascritto e salvato correttamente! 💾`);
                      setIsSavingActiveModalOpen(false);
                      setActiveSaveName('');
                      setConflictSave(null);
                      setTimeout(() => setIsSuccessMessage(null), 5000);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-emerald-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    Sovrascrivi Precedente
                  </button>
                  
                  <button
                    id="conflict-btn-new-version"
                    onClick={async () => {
                      const baseName = activeSaveName.trim() || activeTournamentConfig?.name || `Torneo del ${new Date().toLocaleDateString()}`;
                      
                      let counter = 1;
                      let newName = `${baseName} (v${counter + 1})`;
                      while (saves.some(s => s.name.toLowerCase() === newName.toLowerCase())) {
                        counter++;
                        newName = `${baseName} (v${counter + 1})`;
                      }

                      await onSaveActiveTournament(newName);
                      setIsSuccessMessage(`Torneo salvato come nuova versione: "${newName}"! 💾`);
                      setIsSavingActiveModalOpen(false);
                      setActiveSaveName('');
                      setConflictSave(null);
                      setTimeout(() => setIsSuccessMessage(null), 5000);
                    }}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    Salva Nuova Versione
                  </button>
                  
                  <button
                    id="conflict-btn-cancel"
                    onClick={() => setConflictSave(null)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-sky-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                  <Save className="w-5 h-5 text-sky-500 animate-pulse" />
                  Salva Torneo in Corso
                </h3>
                
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Il torneo verrà salvato con lo stato attuale delle squadre, dei gironi o dei tabelloni ad eliminazione, incluse tutte le partite live o completate. Potrai riaprirlo e riprendere a giocare dallo stesso punto.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Nome del Salvataggio</label>
                    <input
                      type="text"
                      value={activeSaveName}
                      onChange={(e) => setActiveSaveName(e.target.value)}
                      placeholder="E.g., Torneo del Lunedì - Fase Gironi"
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 text-xs">
                    <div className="py-1.5 flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Sotto-titolo / Formula:</span>
                      <span className="text-sky-650 font-black uppercase">
                        {activeTournamentConfig?.formula === 'pools' ? 'Solo Gironi' : 
                         activeTournamentConfig?.formula === 'direct' ? 'Eliminazione Diretta' :
                         activeTournamentConfig?.formula === 'double_elim' ? 'Doppia Eliminazione' :
                         activeTournamentConfig?.formula === 'combined' ? 'Fasi Multiple (Gironi + Playoff)' : activeTournamentConfig?.formula || 'In Corso'}
                      </span>
                    </div>
                    <div className="py-1.5 flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Squadre attive:</span>
                      <span className="text-slate-800 font-black">{activeTeams.length}</span>
                    </div>
                    <div className="py-1.5 flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Partite generate/giocate:</span>
                      <span className="text-slate-800 font-black">{activeMatches.length} Spettate</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    id="modal-btn-cancel-save-active"
                    onClick={() => setIsSavingActiveModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    id="modal-btn-confirm-save-active"
                    onClick={handleSaveActiveSubmit}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700"
                  >
                    Salva Stato
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main List Layout */}
      <div id="archives-workspace-grid" className="bg-white rounded-3xl border border-amber-200/60 p-6 shadow-sm">
        
        {/* Toggle Control for subTab selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-md mb-6 shadow-inner border border-slate-200">
          <button
            onClick={() => setSubTab('historical')}
            className={`flex-1 text-center py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
              subTab === 'historical'
                ? 'bg-white text-sky-950 shadow-md border border-slate-150'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className={`w-4 h-4 ${subTab === 'historical' ? 'text-amber-500' : 'text-slate-400'}`} />
            Archivio Storico ({archives.length})
          </button>
          <button
            onClick={() => setSubTab('in_progress')}
            className={`flex-1 text-center py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
              subTab === 'in_progress'
                ? 'bg-white text-sky-950 shadow-md border border-slate-150'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Save className={`w-4 h-4 ${subTab === 'in_progress' ? 'text-sky-500' : 'text-slate-400'}`} />
            Tornei in Corso ({saves.length})
          </button>
        </div>

        {subTab === 'historical' ? (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Tornei Salvati in Cloud ({archives.length})
                </h2>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-extrabold mt-1">
                  Archivio generale delle passate edizioni della Beach Cup
                </p>
              </div>

          {archives.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-print-archive-summary"
                onClick={handlePrintAllSummary}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Stampa Archivio 🖨️
              </button>
              <button
                id="btn-download-archive-summary-csv"
                onClick={handleDownloadAllSummaryCSV}
                className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border-b-2 border-emerald-700 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Esporta Lista (CSV) 📊
              </button>
            </div>
          )}
        </div>

        {archives.length === 0 ? (
          <div id="empty-archive-placeholder" className="py-16 text-center max-w-md mx-auto">
            <div className="bg-slate-50 p-5 rounded-full inline-block mb-4 text-slate-350 border border-slate-100">
              <Archive className="w-12 h-12 text-slate-350" />
            </div>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">L'Archivio è ancora vuoto</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Nessun torneo è stato memorizzato finora. Genera un tabellone di gara, gioca delle partite e poi usa la sezione "Archivia Campionato Corrente" per inserirlo nello storico in cloud!
            </p>
          </div>
        ) : (
          <div id="archive-items-container" className="space-y-4">
            {archives.map((arc) => {
              const isExpanded = selectedArchiveId === arc.id;
              return (
                <div
                  key={arc.id}
                  id={`archive-card-${arc.id}`}
                  className={`border-2 rounded-2xl overflow-hidden transition-all duration-150 ${
                    isExpanded ? 'border-sky-400 bg-sky-50/20 shadow-md' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                  }`}
                >
                  {/* Card Header row */}
                  <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl shrink-0 mt-0.5 border border-amber-200">
                        <Trophy className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight break-words whitespace-normal">{arc.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-455 uppercase font-bold">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {arc.date}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>Formula: {arc.formula === 'double_elim' ? 'Doppia Eliminazione' : arc.formula === 'combined' ? 'Gironi + Playoff' : arc.formula === 'pools' ? 'Solo Gironi' : 'Eliminazione Diretta'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-sky-655 font-extrabold">{arc.teamsCount} Squadre</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <div className="text-[8px] font-bold text-slate-450 uppercase tracking-widest leading-none">Campione 👑</div>
                        <div className="text-[11px] md:text-xs font-black text-rose-650 uppercase mt-1 leading-none">{arc.winnerTeamName || 'N/A'}</div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          id={`btn-toggle-expand-${arc.id}`}
                          onClick={() => setSelectedArchiveId(isExpanded ? null : arc.id)}
                          className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title={isExpanded ? 'Chiudi Dettagli' : 'Visualizza Dettagli'}
                        >
                          {isExpanded ? <EyeOff className="w-4.5 h-4.5 text-sky-600" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>

                        <button
                          id={`btn-print-single-${arc.id}`}
                          onClick={() => handlePrintSingle(arc)}
                          className="p-2 text-slate-650 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title="Stampa Report Torneo 🖨️"
                        >
                          <Printer className="w-4.5 h-4.5" />
                        </button>

                        <button
                          id={`btn-download-csv-${arc.id}`}
                          onClick={() => handleDownloadSingleCSV(arc)}
                          className="p-2 text-slate-650 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Scarica Tabella Excel (CSV)"
                        >
                          <Download className="w-4.5 h-4.5" />
                        </button>

                        {isAdmin && (
                          <button
                            id={`btn-delete-archive-${arc.id}`}
                            onClick={() => handleDeleteArchive(arc.id)}
                            className="p-2 text-red-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                            title="Elimina dall'archivio permanente 🗑️"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-sky-100 bg-sky-50/5 p-4 md:p-6 space-y-6">
                      
                      {/* Podio del Torneo */}
                      <div className="bg-gradient-to-b from-amber-50/50 to-orange-50/20 rounded-2xl border border-amber-200/50 p-5 shadow-sm">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-4 flex items-center justify-center gap-1">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          Podio Ufficiale dell'Edizione
                        </h4>

                        {arc.podium ? (
                          <div className="flex justify-center items-end gap-3 xs:gap-6 md:gap-12 max-w-md mx-auto pt-2">
                            {/* 2nd Place */}
                            {arc.podium.second && (
                              <div className="flex flex-col items-center flex-1 min-w-0">
                                <div className="relative mb-1">
                                  <div className="w-9 h-9 bg-slate-100 border-2 border-slate-300 rounded-full flex items-center justify-center shadow">
                                    <span className="text-slate-500 font-bold text-xs">🥈</span>
                                  </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-800 text-center uppercase tracking-wide truncate max-w-full">{arc.podium.second.name}</div>
                                <div className="text-[9px] text-slate-400 text-center truncate max-w-full">{arc.podium.second.player1} / {arc.podium.second.player2}</div>
                                <div className="w-14 xs:w-18 bg-slate-200 border-t-2 border-slate-300 rounded-t-xl h-8 mt-2 flex items-center justify-center text-slate-500 font-black font-mono text-[10px]">
                                  II
                                </div>
                              </div>
                            )}

                            {/* 1st Place */}
                            {arc.podium.first ? (
                              <div className="flex flex-col items-center flex-1 min-w-0">
                                <div className="relative mb-1">
                                  <div className="w-12 h-12 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-orange-550 font-bold text-base">🏆</span>
                                  </div>
                                </div>
                                <div className="text-xs font-black text-orange-950 text-center uppercase tracking-wide truncate max-w-full">{arc.podium.first.name}</div>
                                <div className="text-[9px] text-amber-700 text-center truncate max-w-full font-medium">{arc.podium.first.player1} / {arc.podium.first.player2}</div>
                                <div className="w-18 xs:w-22 bg-amber-400 border-t-2 border-amber-600 rounded-t-xl h-12 mt-2 flex items-center justify-center text-white font-black font-mono text-xs">
                                  I
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center flex-1 min-w-0">
                                <div className="relative mb-1">
                                  <div className="w-12 h-12 bg-amber-100 border-2 border-amber-300 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-orange-550 font-bold text-base">🏆</span>
                                  </div>
                                </div>
                                <div className="text-xs font-black text-orange-950 text-center uppercase tracking-wide truncate max-w-full">{arc.winnerTeamName || 'N/A'}</div>
                                <div className="w-18 xs:w-22 bg-amber-400 border-t-2 border-amber-600 rounded-t-xl h-12 mt-2 flex items-center justify-center text-white font-black font-mono text-xs">
                                  I
                                </div>
                              </div>
                            )}

                            {/* 3rd Place */}
                            {arc.podium.third && (
                              <div className="flex flex-col items-center flex-1 min-w-0">
                                <div className="relative mb-1">
                                  <div className="w-9 h-9 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center shadow">
                                    <span className="text-amber-700 font-bold text-xs">🥉</span>
                                  </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-800 text-center uppercase tracking-wide truncate max-w-full">{arc.podium.third.name}</div>
                                <div className="text-[9px] text-amber-750 text-center truncate max-w-full">{arc.podium.third.player1} / {arc.podium.third.player2}</div>
                                <div className="w-14 xs:w-18 bg-amber-100 border-t-2 border-amber-250 rounded-t-xl h-6 mt-2 flex items-center justify-center text-amber-700 font-black font-mono text-[10px]">
                                  III
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-xs font-bold text-orange-800 uppercase flex items-center justify-center gap-2">
                            <span>Vincitore Registrato:</span>
                            <span className="bg-amber-100 px-3 py-1 rounded-full text-amber-900">{arc.winnerTeamName || 'N/A'}</span>
                          </div>
                        )}
                      </div>

                      {/* Lista d'Ingresso Ufficiale */}
                      <div>
                        <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-sky-600" />
                          Lista d'Ingresso Partecipanti ({arc.teams.length})
                        </h4>
                        
                        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-inner">
                          <table className="w-full text-xs font-sans">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                <th className="p-3 font-semibold text-slate-500 uppercase tracking-wider w-[10%]">Pos.</th>
                                <th className="p-3 font-semibold text-slate-500 uppercase tracking-wider w-[45%]">Squadra / Atleti</th>
                                <th className="p-3 font-semibold text-slate-500 uppercase tracking-wider w-[20%] text-center">Livello</th>
                                <th className="p-3 font-semibold text-slate-500 uppercase tracking-wider w-[25%] text-center">Registrato Il</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {arc.teams.map((t, index) => (
                                <tr key={t.id || index} className="hover:bg-slate-50/30">
                                  <td className="p-3 font-bold text-slate-400">
                                    #{index + 1}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                                      <span>{t.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-450 mt-0.5">{t.player1} • {t.player2}</div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-sky-100">
                                      {t.level}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-[10px] text-slate-400 font-mono font-bold">
                                    {t.registeredAt ? new Date(t.registeredAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Save className="w-5 h-5 text-sky-500" />
                  Tornei in Corso Salvati ({saves.length})
                </h2>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-extrabold mt-1">
                  Seleziona un salvataggio per ripristinare il torneo esattamente al punto in cui si trovava
                </p>
              </div>
            </div>

            {saves.length === 0 ? (
              <div id="empty-saves-placeholder" className="py-16 text-center max-w-md mx-auto">
                <div className="bg-slate-50 p-5 rounded-full inline-block mb-4 text-slate-350 border border-slate-100">
                  <Save className="w-12 h-12 text-slate-350" />
                </div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Nessun salvataggio in corso</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Non ci sono salvataggi attivi. Usa il pulsante "Salva Torneo in Corso" sopra per memorizzare un torneo attivo!
                </p>
              </div>
            ) : (
              <div id="save-items-container" className="space-y-4">
                {saves.map((sv) => {
                  const formulaLabel = sv.formula === 'pools' ? 'Solo Gironi' : 
                                      sv.formula === 'direct' ? 'Eliminazione Diretta' :
                                      sv.formula === 'double_elim' ? 'Doppia Eliminazione' :
                                      sv.formula === 'combined' ? 'Fasi Multiple (Gironi + Playoff)' : sv.formula;

                  return (
                    <div
                      key={sv.id}
                      id={`save-card-${sv.id}`}
                      className="border-2 rounded-2xl overflow-hidden border-slate-100 bg-slate-50/10 hover:border-slate-200 transition-all p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-sky-100 text-sky-600 p-2.5 rounded-xl shrink-0 mt-0.5 border border-sky-200">
                          <Save className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight break-words whitespace-normal">{sv.name}</h3>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-405 uppercase font-bold">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {sv.date}
                            </span>
                            <span className="bg-sky-50 text-sky-600 px-2.5 py-0.5 rounded-full text-[9px] font-black border border-sky-100 uppercase">
                              {formulaLabel}
                            </span>
                            <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-[9px] font-black border border-emerald-100">
                              {sv.teamsCount} Squadre
                            </span>
                            {sv.savedBy && (
                              <span className="text-slate-400 font-medium">
                                Salvato da: <span className="font-bold text-slate-500">{sv.savedBy}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => {
                            setRestoreSaveObj(sv);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider py-2 px-3.5 rounded-lg shadow-sm border-b-2 border-emerald-700 flex items-center gap-1 transition-all"
                        >
                          Carica Torneo 🔄
                        </button>
                        
                        {canWrite && (
                          <button
                            onClick={() => {
                              setDeleteSaveId(sv.id);
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-lg transition-all border border-rose-200"
                            title="Elimina salvataggio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal: Delete Archive */}
      {deleteArchiveId && (
        <div id="confirm-delete-archive-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-rose-400">
            <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Elimina dall'Archivio
            </h3>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
              Sei sicuro di voler eliminare questo torneo archiviato in modo permanente? Questa azione <span className="text-rose-600 font-extrabold uppercase">non può essere annullata</span>.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteArchiveId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteArchive}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-rose-750"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Restore Tournament Save */}
      {restoreSaveObj && (
        <div id="confirm-restore-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-emerald-400">
            <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
              <Undo className="w-5 h-5 text-emerald-500 animate-pulse" />
              Ripristina Torneo
            </h3>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
              Sei sicuro di voler CARICARE e RIPRISTINARE il torneo in corso <span className="text-emerald-700 font-extrabold">"{restoreSaveObj.name}"</span>?
            </p>
            
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-3 rounded-xl border border-amber-150 font-bold leading-relaxed">
              ⚠️ ATTENZIONE: Il torneo attualmente in corso verrà completamente sovrascritto e tutti i dati correnti non salvati saranno persi.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setRestoreSaveObj(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
              >
                Annulla
              </button>
              <button
                onClick={confirmRestoreTournament}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-emerald-750"
              >
                Ripristina Stato 🔄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Delete Save */}
      {deleteSaveId && (
        <div id="confirm-delete-save-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-rose-400">
            <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-slate-100 pb-3">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Elimina Salvataggio
            </h3>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
              Sei sicuro di voler eliminare permanentemente questo salvataggio del torneo? Questa operazione <span className="text-rose-600 font-extrabold uppercase">non può essere annullata</span>.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteSaveId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteSave}
                className="flex-1 bg-rose-500 hover:bg-rose-100 text-rose-750 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-rose-300"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
