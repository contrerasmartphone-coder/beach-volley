import React, { useState } from 'react';
import { Team, Match, ArchivedTournament, AppUser } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getGaraNumbersMap } from '../utils';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FileText, Download, Printer, Trash2, Archive, Trophy, Calendar, Award, Eye, EyeOff, FileSpreadsheet, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface ArchiveTabProps {
  currentUser: AppUser | null;
  archives: ArchivedTournament[];
  activeTeams: Team[];
  activeMatches: Match[];
  activeTournamentConfig: any;
  onClearActiveTournament: () => Promise<void>;
}

export default function ArchiveTab({
  currentUser,
  archives,
  activeTeams,
  activeMatches,
  activeTournamentConfig,
  onClearActiveTournament,
}: ArchiveTabProps) {
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState('');
  const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);

  const canWrite = currentUser && (currentUser.role === 'admin' || currentUser.role === 'collaborator');
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Determine potential winner of current tournament
  const getPotentialWinner = (): string => {
    if (!activeMatches || activeMatches.length === 0) return 'N/A';
    // Find final match
    const completed = activeMatches.filter(m => m.status === 'completed');
    if (completed.length === 0) return 'In corso (Nessun vincitore ancora)';
    
    // Find the match with highest round or final (e.g. Finale or round 4, or highest position/id)
    const sorted = [...completed].sort((a, b) => b.round - a.round);
    const finalMatch = sorted[0];
    if (finalMatch) {
      if (finalMatch.team1Score > finalMatch.team2Score && finalMatch.team1) {
        return finalMatch.team1.name;
      } else if (finalMatch.team2Score > finalMatch.team1Score && finalMatch.team2) {
        return finalMatch.team2.name;
      }
    }
    return 'In corso / Non definito';
  };

  // Archive current tournament
  const handleArchiveCurrent = async () => {
    if (activeMatches.length === 0) return;
    const nameToUse = archiveName.trim() || activeTournamentConfig?.name || `Capionato del ${new Date().toLocaleDateString()}`;
    
    const newArchive: ArchivedTournament = {
      id: `archive-${Date.now()}`,
      name: nameToUse,
      date: new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      formula: activeTournamentConfig?.formula || 'N/A',
      teamsCount: activeTeams.length,
      teams: activeTeams,
      matches: activeMatches,
      winnerTeamName: getPotentialWinner(),
    };

    try {
      await setDoc(doc(db, 'archives', newArchive.id), newArchive);
      setIsSuccessMessage(`Torneo "${nameToUse}" archiviato con successo nell'archivio storico! 🏅`);
      setIsArchivingModalOpen(false);
      setArchiveName('');
      setTimeout(() => setIsSuccessMessage(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `archives/${newArchive.id}`);
    }
  };

  // Delete archive
  const handleDeleteArchive = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo torneo archiviato in modo permanente?')) return;
    try {
      await deleteDoc(doc(db, 'archives', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `archives/${id}`);
    }
  };

  // Export functions
  const convertTournamentToCSV = (arc: ArchivedTournament): string => {
    let csv = `ID Torneo,${arc.id}\n`;
    csv += `Nome Torneo,${arc.name}\n`;
    csv += `Data Archiviazione,${arc.date}\n`;
    csv += `Formula,${arc.formula.toUpperCase()}\n`;
    csv += `Squadre Partecipanti,${arc.teamsCount}\n`;
    csv += `Vincitore,${arc.winnerTeamName || 'N/A'}\n\n`;

    // Teams Section
    csv += `SQUADRE E STATISTICHE\n`;
    csv += `Squadra,Giocatori,Vittorie,Sconfitte,Punti Gara,Set Vinti,Set Persi,Punti fatti,Punti subiti\n`;
    arc.teams.forEach(t => {
      csv += `"${t.name}","${t.player1} e ${t.player2}",${t.wins || 0},${t.losses || 0},${t.points || 0},${t.setsWon || 0},${t.setsLost || 0},${t.pointsWon || 0},${t.pointsLost || 0}\n`;
    });
    csv += `\n`;

    // Matches Section
    csv += `CALENDARIO E RISULTATI\n`;
    csv += `Match ID,Fase,Turno,Campo,Ora,Squadra 1,Squadra 2,Punteggio,Stato,Set Dettaglio\n`;
    arc.matches.forEach(m => {
      const t1 = m.team1 ? m.team1.name : 'TBD';
      const t2 = m.team2 ? m.team2.name : 'TBD';
      const setsStr = m.sets && m.sets.length > 0 
        ? m.sets.map(s => `${s.team1}-${s.team2}`).join(' / ')
        : '';
      csv += `${m.id},"${m.phase || ''}","${m.roundLabel || m.round}","${m.court}","${m.time}","${t1}","${t2}","${m.team1Score}-${m.team2Score}","${m.status}","${setsStr}"\n`;
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

    const teamsHTML = arc.teams.map((t, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold; text-align: left;">#${idx + 1} ${t.name}</td>
        <td style="padding: 10px; text-align: left;">${t.player1} / ${t.player2}</td>
        <td style="padding: 10px; font-weight: bold; text-align: center;">${t.level}</td>
        <td style="padding: 10px; text-align: center;">${t.wins} - ${t.losses}</td>
        <td style="padding: 10px; font-weight: bold; text-align: center; color: #0284c7;">${t.points || 0}</td>
        <td style="padding: 10px; text-align: center;">${t.setsWon} - ${t.setsLost}</td>
        <td style="padding: 10px; text-align: center;">${t.pointsWon} - ${t.pointsLost}</td>
      </tr>
    `).join('');

    const matchesHTML = arc.matches.map(m => {
      const setsStr = m.sets && m.sets.length > 0 
        ? m.sets.map((s, idx) => `Set ${idx + 1}: ${s.team1}-${s.team2}`).join('&nbsp;&nbsp;|&nbsp;&nbsp;')
        : 'In attesa punteggio';
      return `
        <div style="border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 5px;">
            <span>CAMPO ${m.court} @ ORA ${m.time} (${m.roundLabel || `Turno ${m.round}`})</span>
            <span style="font-weight: bold; text-transform: uppercase;">Stato: ${m.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold;">
            <span style="${m.status === 'completed' && m.team1Score > m.team2Score ? 'color: #ea580c;' : ''}">${m.team1 ? m.team1.name : 'TBD'}</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 16px;">${m.team1Score} - ${m.team2Score}</span>
            <span style="${m.status === 'completed' && m.team2Score > m.team1Score ? 'color: #ea580c;' : ''}">${m.team2 ? m.team2.name : 'TBD'}</span>
          </div>
          <div style="font-size: 11px; color: #555; margin-top: 6px; border-top: 1px dashed #eee; padding-top: 6px; text-align: center;">
            ${setsStr}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificato Torneo Beach Volley: ${arc.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.5; }
            h1 { color: #0284c7; text-transform: uppercase; font-size: 26px; border-b: 4px solid #0284c7; padding-bottom: 10px; }
            .info-box { display: flex; justify-content: space-between; background: #f0f9ff; border: 2px solid #bae6fd; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
            .section-title { font-size: 18px; color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f1f5f9; padding: 12px; font-weight: bold; font-size: 12px; text-transform: uppercase; text-align: left; }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Report Torneo Beach Volley</h1>
          <div class="info-box">
            <div>
              <p><strong>Nome Torneo:</strong> ${arc.name}</p>
              <p><strong>Formula:</strong> ${arc.formula.toUpperCase()}</p>
              <p><strong>Data Archiviazione:</strong> ${arc.date}</p>
            </div>
            <div style="text-align: right; background: #fffbeb; border: 2px solid #fef3c7; padding: 12px 24px; border-radius: 8px; box-shadow: inset 0 0 5px rgba(0,0,0,0.05);">
              <h3 style="color: #d97706; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campioni del Torneo 🏆</h3>
              <p style="font-size: 22px; font-weight: 900; margin: 5px 0 0 0; color: #92400e;">${arc.winnerTeamName || 'N/A'}</p>
            </div>
          </div>

          <div class="section-title">Classifiche & Team Partecipanti (${arc.teamsCount})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Squadra</th>
                <th style="width: 25%;">Atleti</th>
                <th style="width: 10%; text-align: center;">Livello</th>
                <th style="width: 10%; text-align: center;">Gare V/P</th>
                <th style="width: 10%; text-align: center;">Punti Gara</th>
                <th style="width: 10%; text-align: center;">Set V/P</th>
                <th style="width: 10%; text-align: center;">Punti V/P</th>
              </tr>
            </thead>
            <tbody>
              ${teamsHTML}
            </tbody>
          </table>

          <div class="section-title" style="page-break-before: always;">Calendario Tabelloni & Match realizzati</div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
            ${matchesHTML}
          </div>

          <footer style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-t: 1px solid #e2e8f0; padding-top: 15px;">
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
      {activeMatches.length > 0 && (
        <div id="active-tournament-archive-panel" className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-3xl p-6 text-white shadow-xl border-4 border-sky-300 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3.5 rounded-2xl shrink-0 border border-white/30 shadow-inner">
              <Archive className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight leading-none">Archivia Campionato Corrente</h3>
              <p className="text-xs text-sky-100 mt-2 font-bold uppercase tracking-wider">
                Fase Attiva: {activeTournamentConfig?.name || 'In Corso'} • {activeTeams.length} Squadre • Campione Provvisorio: <span className="text-amber-300 font-extrabold">{getPotentialWinner()}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {canWrite ? (
              <button
                id="btn-trigger-archival-modal"
                onClick={() => {
                  setArchiveName(activeTournamentConfig?.name || '');
                  setIsArchivingModalOpen(true);
                }}
                className="bg-white hover:bg-orange-50 text-sky-900 border-2 border-white scale-100 hover:scale-105 active:scale-95 py-2.5 px-6 font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-orange-500" />
                Salva in Archivio 💾
              </button>
            ) : (
              <div className="text-[10px] bg-black/20 py-2 px-3 rounded-lg text-yellow-300 font-black tracking-wider uppercase max-w-[200px] text-center border border-yellow-400/30">
                ⚠️ ACCEDI COME ADMIN O COLLABORATORE PER ARCHIVIARE IL TORNEO
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

      {/* Main List Layout */}
      <div id="archives-workspace-grid" className="bg-white rounded-3xl border border-amber-200/60 p-6 shadow-sm">
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
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{arc.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-450 uppercase font-bold">
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
                      
                      {/* Expanded Sub Section: Standings */}
                      <div>
                        <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Award className="w-4 h-4 text-orange-550" />
                          Classifica Finale & Rendimento
                        </h4>
                        
                        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-inner">
                          <table className="w-full text-xs font-sans">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="p-3 font-semibold text-slate-500 uppercase tracking-wider">Squadra / Giocatori</th>
                                <th className="p-3 text-center font-semibold text-slate-500 uppercase tracking-wider">Livello</th>
                                <th className="p-3 text-center font-semibold text-slate-500 uppercase tracking-wider">Vinte</th>
                                <th className="p-3 text-center font-semibold text-slate-500 uppercase tracking-wider">Perse</th>
                                <th className="p-3 text-center font-semibold text-slate-500 uppercase tracking-wider">Set V/P</th>
                                <th className="p-3 text-center font-semibold text-slate-500 uppercase tracking-wider">Punti Squadra</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {arc.teams.map((t, index) => (
                                <tr key={t.id} className="hover:bg-slate-50/30">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
                                      {t.name === arc.winnerTeamName ? '🏆' : `${index + 1}.`}
                                      <span>{t.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-450 mt-0.5">{t.player1} • {t.player2}</div>
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-500">{t.level}</td>
                                  <td className="p-3 text-center font-bold text-emerald-600 font-mono">{t.wins}</td>
                                  <td className="p-3 text-center font-bold text-red-500 font-mono">{t.losses}</td>
                                  <td className="p-3 text-center font-medium text-slate-600 font-mono">{t.setsWon} - {t.setsLost}</td>
                                  <td className="p-3 text-center font-black text-sky-700 font-mono text-xs">{t.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Expanded Sub Section: Match list */}
                      <div>
                        <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-sky-550" />
                          Storico Gare & Match Giocati
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(() => {
                            const garaNumbers = getGaraNumbersMap(arc.matches);
                            return arc.matches.map((m) => {
                              const isT1Winner = m.status === 'completed' && m.team1Score > m.team2Score;
                              const isT2Winner = m.status === 'completed' && m.team2Score > m.team1Score;
                              const garaNum = garaNumbers[m.id];
                              return (
                                <div key={m.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-inner flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-black tracking-wider mb-2 border-b border-gray-150 pb-1.5">
                                      <div className="flex gap-1.5 items-center">
                                        {garaNum && (
                                          <span className="font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded uppercase text-[10px] shadow-sm">
                                            Gara {garaNum}
                                          </span>
                                        )}
                                        <span>Campo {m.court} • Ore {m.time}</span>
                                      </div>
                                      <span className="text-sky-655">{m.roundLabel || `Turno ${m.round}`}</span>
                                    </div>

                                    <div className="space-y-1.5">
                                      <div className={`flex justify-between items-center text-xs font-bold uppercase transition-all ${isT1Winner ? 'text-orange-655' : 'text-slate-700'}`}>
                                        <span className="truncate max-w-[150px]">{m.team1 ? m.team1.name : 'TBD'}</span>
                                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-[11px]">{m.team1Score}</span>
                                      </div>
                                      <div className={`flex justify-between items-center text-xs font-bold uppercase transition-all ${isT2Winner ? 'text-orange-655' : 'text-slate-700'}`}>
                                        <span className="truncate max-w-[150px]">{m.team2 ? m.team2.name : 'TBD'}</span>
                                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-[11px]">{m.team2Score}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {m.sets && m.sets.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex flex-wrap gap-1 text-[9px] text-slate-400 font-mono justify-center">
                                      {m.sets.map((s, idx) => (
                                        <span key={idx} className="bg-slate-50 px-1.5 py-0.5 rounded">Set {idx + 1}: {s.team1}-{s.team2}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
