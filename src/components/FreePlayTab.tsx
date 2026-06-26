import React, { useState, useEffect } from "react";
import { AppUser, FreePlayMatch } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
} from "firebase/firestore";
import {
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Trophy,
  Users,
  Award,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FreePlayTabProps {
  currentUser: AppUser | null;
  users: AppUser[];
}

export default function FreePlayTab({ currentUser, users }: FreePlayTabProps) {
  const [matches, setMatches] = useState<FreePlayMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [player1A, setPlayer1A] = useState<AppUser | null>(null);
  const [player1B, setPlayer1B] = useState<AppUser | null>(null);
  const [player2A, setPlayer2A] = useState<AppUser | null>(null);
  const [player2B, setPlayer2B] = useState<AppUser | null>(null);

  // Search filter query for selecting athletes in form
  const [searchQuery1A, setSearchQuery1A] = useState("");
  const [searchQuery1B, setSearchQuery1B] = useState("");
  const [searchQuery2A, setSearchQuery2A] = useState("");
  const [searchQuery2B, setSearchQuery2B] = useState("");

  // Dropdown open states
  const [openSelect, setOpenSelect] = useState<"1A" | "1B" | "2A" | "2B" | null>(null);

  // Edit State
  const [editingMatch, setEditingMatch] = useState<FreePlayMatch | null>(null);
  const [editPlayer1A, setEditPlayer1A] = useState<AppUser | null>(null);
  const [editPlayer1B, setEditPlayer1B] = useState<AppUser | null>(null);
  const [editPlayer2A, setEditPlayer2A] = useState<AppUser | null>(null);
  const [editPlayer2B, setEditPlayer2B] = useState<AppUser | null>(null);
  const [editSearch1A, setEditSearch1A] = useState("");
  const [editSearch1B, setEditSearch1B] = useState("");
  const [editSearch2A, setEditSearch2A] = useState("");
  const [editSearch2B, setEditSearch2B] = useState("");

  // Notification / Error banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Local storage for today date
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Real-time Firestore sync
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, "freePlayMatches"),
      (snapshot) => {
        const list: FreePlayMatch[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as FreePlayMatch);
        });
        // Sort by createdAt ascending (queue order)
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMatches(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Firestore sync error freePlayMatches:", err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const isAdminOrCollaborator =
    currentUser?.role === "admin" || currentUser?.role === "collaborator";

  // Filter users who are marked as athletes or are regular users
  const eligibleAthletes = users.filter(
    (u) => u.isAthlete || u.role === "ATLETA" || u.role === "admin" || u.role === "collaborator"
  );

  const activeMatches = matches.filter((m) => m.status === "pending");
  const existingPartialMatch = activeMatches.find(
    (m) => !m.player1AId || !m.player1BId || !m.player2AId || !m.player2BId
  );
  const completedMatchesToday = matches.filter(
    (m) => m.status === "completed" && m.date === getTodayDateString()
  );

  // Validation function
  const validateMatchRegistration = (
    p1A: AppUser | null,
    p1B: AppUser | null,
    p2A: AppUser | null,
    p2B: AppUser | null,
    matchIdToExclude?: string
  ): string | null => {
    if (!p1A) {
      return "Il Giocatore 1 (Squadra 1) è obbligatorio.";
    }

    const selectedPlayers = [p1A, p1B, p2A, p2B].filter((p): p is AppUser => p !== null);

    const selectedIds = selectedPlayers.map(p => p.id);
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      return "Un giocatore non può essere inserito più volte nella stessa partita.";
    }

    // 1. Check Wsicily registration status
    for (const player of selectedPlayers) {
      if (!player.isTesseratoWsicily) {
        return `Iscrizione non possibile, l'utente ${player.nome || ""} ${player.cognome || ""} (${player.username}) non è tesserato`;
      }
    }

    // 2. Check if already in another pending free play match
    for (const player of selectedPlayers) {
      const isAlreadyPlaying = activeMatches.some((m) => {
        if (matchIdToExclude && m.id === matchIdToExclude) return false;
        return (
          (m.player1AId === player.id && m.player1AId !== "") ||
          (m.player1BId === player.id && m.player1BId !== "") ||
          (m.player2AId === player.id && m.player2AId !== "") ||
          (m.player2BId === player.id && m.player2BId !== "")
        );
      });

      if (isAlreadyPlaying) {
        return `ISCRIZIONE NON POSSIBILE, L'UTENTE ${player.nome || ""} ${player.cognome || ""} (${player.username}) è già presente in lista`;
      }
    }

    // 3. Check if there's already a partial match with waiting players in the list
    const isNewMatchPartial = !p1A || !p1B || !p2A || !p2B;
    const hasExistingPartialMatch = activeMatches.some((m) => {
      if (matchIdToExclude && m.id === matchIdToExclude) return false;
      return !m.player1AId || !m.player1BId || !m.player2AId || !m.player2BId;
    });

    if (isNewMatchPartial && hasExistingPartialMatch) {
      return "Non è consentito creare un'altra partita parziale con giocatori in attesa se ne esiste già una in lista. Ti invitiamo a completare o modificare la partita parziale già presente.";
    }

    return null;
  };

  const handleRegisterMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const validationError = validateMatchRegistration(player1A, player1B, player2A, player2B);
    if (validationError) {
      setErrorBanner(validationError);
      return;
    }

    try {
      const matchColRef = collection(db, "freePlayMatches");
      const matchDocRef = doc(matchColRef);
      const matchId = matchDocRef.id;

      const newMatch: FreePlayMatch = {
        id: matchId,
        player1AId: player1A?.id || "",
        player1AName: player1A ? (`${player1A.nome || ""} ${player1A.cognome || ""}`.trim() || player1A.username) : "In attesa...",
        player1BId: player1B?.id || "",
        player1BName: player1B ? (`${player1B.nome || ""} ${player1B.cognome || ""}`.trim() || player1B.username) : "In attesa...",
        player2AId: player2A?.id || "",
        player2AName: player2A ? (`${player2A.nome || ""} ${player2A.cognome || ""}`.trim() || player2A.username) : "In attesa...",
        player2BId: player2B?.id || "",
        player2BName: player2B ? (`${player2B.nome || ""} ${player2B.cognome || ""}`.trim() || player2B.username) : "In attesa...",
        createdAt: new Date().toISOString(),
        status: "pending",
        date: getTodayDateString(),
      };

      await setDoc(matchDocRef, newMatch);

      setSuccessBanner("Iscrizione al turno di gioco avvenuta con successo! 🏐");
      setIsAddOpen(false);

      // Clear selection states
      setPlayer1A(null);
      setPlayer1B(null);
      setPlayer2A(null);
      setPlayer2B(null);
      setSearchQuery1A("");
      setSearchQuery1B("");
      setSearchQuery2A("");
      setSearchQuery2B("");

      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "freePlayMatches");
      setErrorBanner("Errore durante il salvataggio dell'iscrizione.");
    }
  };

  const handleConcludeMatch = async (match: FreePlayMatch) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const matchRef = doc(db, "freePlayMatches", match.id);
      await setDoc(
        matchRef,
        {
          status: "completed",
          completedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSuccessBanner("Partita conclusa e spostata in archivio! 🏆");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `freePlayMatches/${match.id}`);
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    if (!window.confirm("Sei sicuro di voler annullare questa prenotazione?")) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await deleteDoc(doc(db, "freePlayMatches", matchId));
      setSuccessBanner("Prenotazione annullata con successo.");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `freePlayMatches/${matchId}`);
    }
  };

  const handleClearCompletedToday = async () => {
    if (!window.confirm("Sei sicuro di voler svuotare tutte le partite giocate di oggi? Questa operazione è irreversibile.")) {
      return;
    }
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const todayMatches = matches.filter(
        (m) => m.status === "completed" && m.date === getTodayDateString()
      );
      for (const match of todayMatches) {
        await deleteDoc(doc(db, "freePlayMatches", match.id));
      }
      setSuccessBanner("Partite di oggi svuotate con successo!");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "freePlayMatches");
      setErrorBanner("Errore durante lo svuotamento delle partite.");
    }
  };

  const startEditMatch = (match: FreePlayMatch) => {
    setEditingMatch(match);
    setEditPlayer1A(users.find((u) => u.id === match.player1AId) || null);
    setEditPlayer1B(users.find((u) => u.id === match.player1BId) || null);
    setEditPlayer2A(users.find((u) => u.id === match.player2AId) || null);
    setEditPlayer2B(users.find((u) => u.id === match.player2BId) || null);
    setEditSearch1A("");
    setEditSearch1B("");
    setEditSearch2A("");
    setEditSearch2B("");
    setOpenSelect(null);
  };

  const handleSaveEditMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setErrorBanner(null);
    setSuccessBanner(null);

    const validationError = validateMatchRegistration(
      editPlayer1A,
      editPlayer1B,
      editPlayer2A,
      editPlayer2B,
      editingMatch.id
    );

    if (validationError) {
      setErrorBanner(validationError);
      return;
    }

    try {
      const matchRef = doc(db, "freePlayMatches", editingMatch.id);
      await setDoc(
        matchRef,
        {
          player1AId: editPlayer1A?.id || "",
          player1AName: editPlayer1A ? (`${editPlayer1A.nome || ""} ${editPlayer1A.cognome || ""}`.trim() || editPlayer1A.username) : "In attesa...",
          player1BId: editPlayer1B?.id || "",
          player1BName: editPlayer1B ? (`${editPlayer1B.nome || ""} ${editPlayer1B.cognome || ""}`.trim() || editPlayer1B.username) : "In attesa...",
          player2AId: editPlayer2A?.id || "",
          player2AName: editPlayer2A ? (`${editPlayer2A.nome || ""} ${editPlayer2A.cognome || ""}`.trim() || editPlayer2A.username) : "In attesa...",
          player2BId: editPlayer2B?.id || "",
          player2BName: editPlayer2B ? (`${editPlayer2B.nome || ""} ${editPlayer2B.cognome || ""}`.trim() || editPlayer2B.username) : "In attesa...",
        },
        { merge: true }
      );

      setSuccessBanner("Modifica atleti salvata con successo!");
      setEditingMatch(null);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `freePlayMatches/${editingMatch.id}`);
      setErrorBanner("Errore durante il salvataggio della modifica.");
    }
  };

  // Compute daily match count for users who played at least once
  const getDailyStats = () => {
    const statsMap: Record<string, { user: AppUser; count: number }> = {};

    // Initialize all registered athletes with 0 count
    eligibleAthletes.forEach((u) => {
      statsMap[u.id] = { user: u, count: 0 };
    });

    // Populate counts from completed matches of today
    completedMatchesToday.forEach((m) => {
      [m.player1AId, m.player1BId, m.player2AId, m.player2BId].forEach((id) => {
        if (statsMap[id]) {
          statsMap[id].count += 1;
        }
      });
    });

    // Only return athletes who have played at least once, or let's show all who played.
    // "conteggio giornaliero partite giocate per tutti gli utenti che risultano almeno una volta presenti nella lista"
    return Object.values(statsMap)
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  const dailyStats = getDailyStats();

  const renderSearchableSelect = (
    label: string,
    idKey: "1A" | "1B" | "2A" | "2B",
    selectedPlayer: AppUser | null,
    setSelectedPlayer: (u: AppUser | null) => void,
    searchQuery: string,
    setSearchQuery: (s: string) => void
  ) => {
    const getExcludedIds = () => {
      // Get IDs of players already in other pending matches in the waiting list
      const queueIds: string[] = [];
      activeMatches.forEach((m) => {
        if (editingMatch && m.id === editingMatch.id) return;
        queueIds.push(m.player1AId, m.player1BId, m.player2AId, m.player2BId);
      });

      if (isAddOpen) {
        const ids = {
          "1A": [player1B?.id, player2A?.id, player2B?.id],
          "1B": [player1A?.id, player2A?.id, player2B?.id],
          "2A": [player1A?.id, player1B?.id, player2B?.id],
          "2B": [player1A?.id, player1B?.id, player2A?.id]
        };
        const currentSelected = ids[idKey].filter(Boolean) as string[];
        return [...new Set([...currentSelected, ...queueIds])].filter(id => id !== "");
      } else {
        const ids = {
          "1A": [editPlayer1B?.id, editPlayer2A?.id, editPlayer2B?.id],
          "1B": [editPlayer1A?.id, editPlayer2A?.id, editPlayer2B?.id],
          "2A": [editPlayer1A?.id, editPlayer1B?.id, editPlayer2B?.id],
          "2B": [editPlayer1A?.id, editPlayer1B?.id, editPlayer2A?.id]
        };
        const currentSelected = ids[idKey].filter(Boolean) as string[];
        return [...new Set([...currentSelected, ...queueIds])].filter(id => id !== "");
      }
    };

    const excludedIds = getExcludedIds();

    const filteredUsers = eligibleAthletes.filter((u) => {
      // 1. Only registered/tesserati players
      if (!u.isTesseratoWsicily) return false;

      // 2. Exclude already selected players in other slots
      if (excludedIds.includes(u.id)) return false;

      // 3. Match the search query
      const fullName = `${u.nome || ""} ${u.cognome || ""}`.toLowerCase();
      const userLower = u.username.toLowerCase();
      const q = searchQuery.toLowerCase();
      return fullName.includes(q) || userLower.includes(q);
    });

    const isDropdownOpen = openSelect === idKey;

    return (
      <div className="relative space-y-2">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          {selectedPlayer ? (
            <div className="flex items-center justify-between bg-slate-50 border-2 border-sky-400 rounded-xl p-3 text-xs font-bold text-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-500" />
                <span>
                  {selectedPlayer.nome} {selectedPlayer.cognome} ({selectedPlayer.username})
                </span>
                {selectedPlayer.isTesseratoWsicily ? (
                  <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase">
                    Wsicily 🎗️
                  </span>
                ) : (
                  <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase">
                    Non Tesserato ❌
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlayer(null);
                  setSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca per Nome, Cognome o Username..."
                  value={searchQuery}
                  onFocus={() => setOpenSelect(idKey)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOpenSelect(idKey);
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all placeholder-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg animate-in fade-in duration-100">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 font-semibold text-center">
                      Nessun atleta trovato
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlayer(u);
                          setOpenSelect(null);
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {u.nome || ""} {u.cognome || ""} ({u.username})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {u.isTesseratoWsicily ? (
                            <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase">
                              Wsicily 🎗️
                            </span>
                          ) : (
                            <span className="text-[9px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-black uppercase">
                              No Tesserato ❌
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1 font-sans">
      {/* Header Info */}
      <div className="bg-white rounded-3xl border-4 border-slate-250 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
              <Play className="w-5 h-5 fill-sky-600" />
            </span>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
              Free Play - Turno di Gioco 🏐
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Gestisci la lista di attesa e i turni di gioco del campo da beach volley. Iscriviti con
            la tua coppia e sfida i tuoi avversari.
          </p>
        </div>
        {currentUser && (
          <button
            onClick={() => {
              setIsAddOpen(true);
              setErrorBanner(null);
            }}
            className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[11px] tracking-wider py-3 px-6 rounded-2xl shadow-md transition-all border-b-4 border-sky-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Iscriviti al Turno
          </button>
        )}
      </div>

      {/* Alert / Error banners */}
      <AnimatePresence>
        {errorBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 text-xs font-bold text-rose-800 flex items-start gap-2.5 shadow-sm"
          >
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wide text-rose-600">Attenzione - Errore Iscrizione</p>
              <p>{errorBanner}</p>
            </div>
          </motion.div>
        )}

        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-sm"
          >
            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{successBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Waiting Queue of Free Play Matches */}
      <div className="bg-white rounded-3xl border-4 border-slate-250 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            Turno Attivo & Lista d'Attesa ({activeMatches.length} Partite)
          </h2>
          {isLoading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>

        {activeMatches.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Play className="w-12 h-12 mx-auto text-slate-200 animate-pulse" />
            <p className="font-black uppercase text-xs tracking-wider">Nessun turno di gioco prenotato</p>
            <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">
              Clicca su "Iscriviti al Turno" per avviare una nuova partita di beach volley.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {activeMatches.map((m, index) => {
              const isFirst = index === 0;
              const isParticipant =
                currentUser &&
                [m.player1AId, m.player1BId, m.player2AId, m.player2BId].includes(currentUser.id);

              return (
                <div
                  key={m.id}
                  className={`p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isFirst ? "bg-orange-50/45 border-l-4 border-orange-500" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position indicator */}
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`text-xs font-black uppercase rounded-full w-8 h-8 flex items-center justify-center border-2 ${
                          isFirst
                            ? "bg-orange-500 border-orange-600 text-white animate-bounce shadow-md"
                            : "bg-slate-100 border-slate-250 text-slate-600"
                        }`}
                      >
                        {index + 1}°
                      </span>
                      {isFirst && (
                        <span className="text-[8px] font-black uppercase text-orange-600 mt-1 tracking-wider animate-pulse">
                          In campo
                        </span>
                      )}
                    </div>

                    {/* Match matchup */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Team 1 */}
                        <div className="bg-sky-50 border border-sky-100 rounded-xl py-1.5 px-3 flex items-center gap-1.5 shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-sky-500" />
                          <span className="text-xs font-black text-sky-950">
                            {m.player1AName} / {m.player1BName}
                          </span>
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 italic">
                          VS
                        </span>

                        {/* Team 2 */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-1.5 px-3 flex items-center gap-1.5 shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-black text-emerald-950">
                            {m.player2AName} / {m.player2BName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Prenotato il {new Date(m.createdAt).toLocaleDateString("it-IT")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.createdAt).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {/* Edit athletes button (Admin, Collaborator, or any of the 4 participating players) */}
                    {(isAdminOrCollaborator || isParticipant) && (
                      <>
                        <button
                          onClick={() => startEditMatch(m)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl border border-slate-250 transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer"
                          title="Cambia atleti"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Modifica
                        </button>
                        <button
                          onClick={() => handleCancelMatch(m.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl border border-rose-200 transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer"
                          title="Annulla iscrizione"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Annulla
                        </button>
                      </>
                    )}

                    {/* Conclude button (Only Admin or Collaborator) */}
                    {isAdminOrCollaborator && (
                      <button
                        onClick={() => handleConcludeMatch(m)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-4 rounded-xl border-b-4 border-emerald-700 text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                        title="Segna come conclusa"
                      >
                        <Check className="w-4 h-4" />
                        Concludi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Stats and archive side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Stats (Match counter) */}
        <div className="bg-white rounded-3xl border-4 border-slate-250 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-orange-500" />
              Conteggio Partite Concluse Oggi
            </h2>
            {isAdminOrCollaborator && dailyStats.length > 0 && (
              <button
                onClick={handleClearCompletedToday}
                className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-600 border-2 border-red-200 rounded-full py-1.5 px-3 hover:bg-red-50/50 transition-all cursor-pointer"
              >
                Svuota
              </button>
            )}
          </div>

          {dailyStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-1">
              <p>Nessuna partita disputata oggi</p>
              <p className="text-[10px] text-slate-400 font-semibold">
                Il conteggio si popola man mano che i turni attivi vengono conclusi.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {dailyStats.map((stat, i) => (
                <div
                  key={stat.user.id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-150 p-3 rounded-2xl"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-slate-400 w-5">#{i + 1}</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800">
                        {stat.user.nome} {stat.user.cognome}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">@{stat.user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-orange-600 bg-orange-50 border border-orange-200 w-8 h-8 rounded-full flex items-center justify-center">
                      {stat.count}
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      {stat.count === 1 ? "partita" : "partite"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Archive of concluded matches */}
        <div className="bg-white rounded-3xl border-4 border-slate-250 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" />
              Archivio Partite Giornaliere ({completedMatchesToday.length})
            </h2>
            {isAdminOrCollaborator && completedMatchesToday.length > 0 && (
              <button
                onClick={handleClearCompletedToday}
                className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-600 border-2 border-red-200 rounded-full py-1.5 px-3 hover:bg-red-50/50 transition-all cursor-pointer"
              >
                Svuota
              </button>
            )}
          </div>

          {completedMatchesToday.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-1">
              <p>Nessuna partita in archivio oggi</p>
              <p className="text-[10px] text-slate-400 font-semibold">
                Concludi i turni attivi per vederli apparire qui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-150 max-h-80 overflow-y-auto">
              {completedMatchesToday
                .slice()
                .reverse()
                .map((m) => (
                  <div key={m.id} className="p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        Disputata ✅
                      </span>
                      {m.completedAt && (
                        <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          Conclusa alle{" "}
                          {new Date(m.completedAt).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>
                        {m.player1AName} / {m.player1BName}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase italic">vs</span>
                      <span>
                        {m.player2AName} / {m.player2BName}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide Modal: REGISTER MATCH */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl border-4 border-sky-500 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-wide">
                  Iscrizione al Turno di Gioco
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Seleziona almeno 1 giocatore. Puoi salvare partite parziali e completarle in seguito.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setOpenSelect(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleRegisterMatch} className="p-6 space-y-4">
              {existingPartialMatch && (
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-2xl p-4 text-xs font-semibold flex items-start gap-2.5 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-wide text-amber-800">Partita Parziale Esistente</p>
                    <p>
                      È già presente in lista una partita con giocatori in attesa.
                      Puoi solo creare una partita <span className="font-black">completa di 4 giocatori</span>, oppure puoi completare la partita parziale già presente selezionando "Modifica" sulla partita in coda.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coppia 1 */}
                <div className="space-y-4 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                  <h4 className="text-xs font-black text-sky-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Coppia Sfidante A
                  </h4>

                  {renderSearchableSelect(
                    "Giocatore 1 *",
                    "1A",
                    player1A,
                    setPlayer1A,
                    searchQuery1A,
                    setSearchQuery1A
                  )}

                  {renderSearchableSelect(
                    "Giocatore 2 (Opzionale)",
                    "1B",
                    player1B,
                    setPlayer1B,
                    searchQuery1B,
                    setSearchQuery1B
                  )}
                </div>

                {/* Coppia 2 */}
                <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Coppia Sfidante B
                  </h4>

                  {renderSearchableSelect(
                    "Giocatore 1 (Opzionale)",
                    "2A",
                    player2A,
                    setPlayer2A,
                    searchQuery2A,
                    setSearchQuery2A
                  )}

                  {renderSearchableSelect(
                    "Giocatore 2 (Opzionale)",
                    "2B",
                    player2B,
                    setPlayer2B,
                    searchQuery2B,
                    setSearchQuery2B
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setOpenSelect(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700"
                >
                  Conferma Iscrizione
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide Modal: EDIT MATCH / SUBSTITUTE PLAYERS */}
      {editingMatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl border-4 border-amber-500 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-wide">
                  Modifica Atleti Turno di Gioco
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Modifica o cambia uno o più atleti iscritti.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingMatch(null);
                  setOpenSelect(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEditMatch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coppia 1 */}
                <div className="space-y-4 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                  <h4 className="text-xs font-black text-sky-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Coppia Sfidante A
                  </h4>

                  {renderSearchableSelect(
                    "Giocatore 1 *",
                    "1A",
                    editPlayer1A,
                    setEditPlayer1A,
                    editSearch1A,
                    setEditSearch1A
                  )}

                  {renderSearchableSelect(
                    "Giocatore 2 (Opzionale)",
                    "1B",
                    editPlayer1B,
                    setEditPlayer1B,
                    editSearch1B,
                    setEditSearch1B
                  )}
                </div>

                {/* Coppia 2 */}
                <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Coppia Sfidante B
                  </h4>

                  {renderSearchableSelect(
                    "Giocatore 1 (Opzionale)",
                    "2A",
                    editPlayer2A,
                    setEditPlayer2A,
                    editSearch2A,
                    setEditSearch2A
                  )}

                  {renderSearchableSelect(
                    "Giocatore 2 (Opzionale)",
                    "2B",
                    editPlayer2B,
                    setEditPlayer2B,
                    editSearch2B,
                    setEditSearch2B
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMatch(null);
                    setOpenSelect(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-amber-700"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
