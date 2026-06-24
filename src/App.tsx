import React, { useState, useEffect, useRef } from "react";
import {
  Team,
  Match,
  NotificationLog,
  AppUser,
  ArchivedTournament,
  ActiveTournamentSave,
  RegistrationRequest,
} from "./types";
import {
  DEMO_TEAMS,
  getInitialTeamStats,
  generateDirectEliminationBracket,
  splitTeamsIntoGroups,
  generateRoundRobinMatches,
  generateDoubleEliminationBracket,
  autoResolveAndPropagate,
  sortTeamsByEntryList,
  recalculateTournamentStages,
  getGaraNumbersMap,
} from "./utils";
import TeamsTab from "./components/TeamsTab";
import BracketTab from "./components/BracketTab";
import StandingsTab from "./components/StandingsTab";
import NotificationCenter from "./components/NotificationCenter";
import ArchiveTab from "./components/ArchiveTab";
import UserTab from "./components/UserTab";
import {
  Sun,
  Award,
  Users,
  Bell,
  Sparkles,
  TrendingUp,
  HelpCircle,
  Shield,
  Trophy,
  Check,
  Lock,
  X,
  LogOut,
  Calendar,
  Edit,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  db,
  handleFirestoreError,
  OperationType,
  cleanObject,
} from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
} from "firebase/firestore";

const normalizePhoneForComparison = (phone: string) => {
  let cleaned = phone.replace(/\D/g, ""); // strip non-digits
  if (cleaned.startsWith("0039")) {
    cleaned = cleaned.substring(4);
  }
  if (cleaned.startsWith("39") && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

const logoUrl = new URL(
  "./assets/images/wsicily_logo_white_bg_1781554165519.jpg",
  import.meta.url,
).href;
const contreraLogoUrl = new URL(
  "./assets/images/regenerated_image_1781554021790.png",
  import.meta.url,
).href;

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "teams" | "bracket" | "standings" | "notifications" | "archive" | "users"
  >("teams");

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem("bv_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(900); // 15 minutes session
  const currentUserRef = useRef<AppUser | null>(currentUser);
  const [systemStatus, setSystemStatus] = useState<"online" | "offline">("online");
  const [isStatusLoaded, setIsStatusLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "status"), (docSnap) => {
      if (docSnap.exists()) {
        setSystemStatus(docSnap.data().status as "online" | "offline");
      } else {
        setSystemStatus("online");
      }
      setIsStatusLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleToggleSystemStatus = async () => {
    const newStatus = systemStatus === "online" ? "offline" : "online";
    try {
      await setDoc(doc(db, "config", "status"), { status: newStatus }, { merge: true });
    } catch (err: any) {
      console.error(err);
      alert(`Errore durante l'aggiornamento dello stato del sistema: ${err?.message || err}`);
    }
  };

  const handleSaveTournamentInfo = async () => {
    try {
      await setDoc(
        doc(db, "config", "settings"),
        {
          tournamentDate: editTournamentDate,
          tournamentGender: editTournamentGender,
          tournamentLocation: editTournamentLocation,
        },
        { merge: true },
      );
      setIsEditingTournamentInfo(false);
    } catch (err: any) {
      console.error("Errore salvataggio info torneo:", err);
      alert(`Errore durante il salvataggio delle info torneo: ${err?.message || err}`);
    }
  };

  const handleSaveHeaderLocation = async () => {
    setIsEditingHeaderLocation(false);
    const newLocation = tempHeaderLocation.trim();
    try {
      await setDoc(
        doc(db, "config", "settings"),
        {
          tournamentLocation: newLocation,
        },
        { merge: true },
      );
    } catch (err: any) {
      console.error("Errore salvataggio luogo torneo dall'header:", err);
      alert(`Errore durante il salvataggio del luogo del torneo: ${err?.message || err}`);
    }
  };

  const handleLogout = () => {
    if (currentUserRef.current) {
      const userDocRef = doc(db, "users", currentUserRef.current.id);
      updateDoc(userDocRef, {
        lastActiveAt: Date.now(),
        activeSessionId: null,
      }).catch(console.error);
    }
    setCurrentUser(null);
  };

  // Sync ref with current user
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Connection timer ticks down of active user session
  useEffect(() => {
    if (!currentUser) {
      setSessionTimeLeft(900);
      return;
    }

    const interval = setInterval(() => {
      setSessionTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle session expiration
  useEffect(() => {
    if (currentUser && sessionTimeLeft <= 0) {
      handleLogout();
      setTimeout(() => {
        alert(
          "La tua sessione di connessione è scaduta per inattività. Effettua nuovamente l'accesso.",
        );
      }, 0);
    }
  }, [sessionTimeLeft, currentUser]);

  // Handle user activity renewal of connection timer
  useEffect(() => {
    if (!currentUser) return;

    const renewSession = () => {
      setSessionTimeLeft(900);
    };

    window.addEventListener("click", renewSession);
    window.addEventListener("keypress", renewSession);

    return () => {
      window.removeEventListener("click", renewSession);
      window.removeEventListener("keypress", renewSession);
    };
  }, [currentUser]);

  // Save active ping to DB once a minute to prevent idle timeout
  useEffect(() => {
    if (!currentUser?.id) return;

    const writePing = async () => {
      try {
        await setDoc(
          doc(db, "users", currentUser.id),
          { lastActiveAt: Date.now() },
          { merge: true },
        );
      } catch (err) {
        console.error("Errore salvataggio ping attività:", err);
      }
    };

    writePing(); // immediate write upon login

    const timer = setInterval(() => {
      writePing();
    }, 60000);

    return () => clearInterval(timer);
  }, [currentUser?.id]);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [archives, setArchives] = useState<ArchivedTournament[]>([]);
  const [saves, setSaves] = useState<ActiveTournamentSave[]>([]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration request form states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNome, setRegNome] = useState("");
  const [regCognome, setRegCognome] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regGenere, setRegGenere] = useState<"M" | "F" | "">("");
  const [regDataNascita, setRegDataNascita] = useState("");
  const [regRole, setRegRole] = useState<'admin' | 'collaborator' | 'reader' | 'ATLETA'>("reader");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // State initialized from localStorage (cached copy)
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem("bv_teams");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem("bv_matches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem("bv_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [admittedTeamsCount, setAdmittedTeamsCount] = useState<number | null>(
    () => {
      try {
        const saved = localStorage.getItem("bv_admitted_teams_count");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    },
  );

  const [activeTournamentConfig, setActiveTournamentConfig] = useState<
    any | null
  >(() => {
    try {
      const saved = localStorage.getItem("bv_active_tournament_config");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loadedSaveName, setLoadedSaveName] = useState<string | null>(() => {
    try {
      return localStorage.getItem("bv_loaded_save_name") || null;
    } catch {
      return null;
    }
  });

  const [tournamentDate, setTournamentDate] = useState<string>(() => {
    try {
      return localStorage.getItem("bv_tournament_date") || "";
    } catch {
      return "";
    }
  });

  const [tournamentLocation, setTournamentLocation] = useState<string>(() => {
    try {
      return localStorage.getItem("bv_tournament_location") || "";
    } catch {
      return "";
    }
  });

  const [isEditingHeaderLocation, setIsEditingHeaderLocation] = useState(false);
  const [tempHeaderLocation, setTempHeaderLocation] = useState("");

  const [tournamentGender, setTournamentGender] = useState<"maschile" | "misto" | "femminile" | "">(() => {
    try {
      return (localStorage.getItem("bv_tournament_gender") as any) || "";
    } catch {
      return "";
    }
  });

  const [isEditingTournamentInfo, setIsEditingTournamentInfo] = useState(false);
  const [editTournamentDate, setEditTournamentDate] = useState("");
  const [editTournamentGender, setEditTournamentGender] = useState<"maschile" | "misto" | "femminile" | "">("");
  const [editTournamentLocation, setEditTournamentLocation] = useState("");

  // Synced from Firestore in real-time for all connected users
  useEffect(() => {
    const unsubTeams = onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        const list: Team[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Team);
        });
        list.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
        setTeams(list);
      },
      (error) => {
        console.error("Firestore sync error (teams):", error);
      },
    );

    const unsubMatches = onSnapshot(
      collection(db, "matches"),
      (snapshot) => {
        const list: Match[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Match);
        });
        list.sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.position - b.position;
        });
        setMatches(list);
      },
      (error) => {
        console.error("Firestore sync error (matches):", error);
      },
    );

    const unsubNotifs = onSnapshot(
      collection(db, "notifications"),
      (snapshot) => {
        const list: NotificationLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as NotificationLog);
        });
        list.sort((a, b) => {
          const tA = parseInt(a.id.match(/\d+/)?.at(0) || "0", 10);
          const tB = parseInt(b.id.match(/\d+/)?.at(0) || "0", 10);
          if (tA !== tB) return tB - tA;
          return b.id.localeCompare(a.id);
        });
        setNotifications(list);
      },
      (error) => {
        console.error("Firestore sync error (notifications):", error);
      },
    );

    const unsubConfig = onSnapshot(
      doc(db, "config", "settings"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.admittedTeamsCount !== undefined)
            setAdmittedTeamsCount(data.admittedTeamsCount);
          if (data.activeTournamentConfig !== undefined)
            setActiveTournamentConfig(data.activeTournamentConfig);
          if (data.loadedSaveName !== undefined)
            setLoadedSaveName(data.loadedSaveName);
          else setLoadedSaveName(null);

          if (data.tournamentDate !== undefined) {
            setTournamentDate(data.tournamentDate);
            try {
              localStorage.setItem("bv_tournament_date", data.tournamentDate);
            } catch {}
          } else {
            setTournamentDate("");
            try {
              localStorage.removeItem("bv_tournament_date");
            } catch {}
          }

          if (data.tournamentLocation !== undefined) {
            setTournamentLocation(data.tournamentLocation);
            try {
              localStorage.setItem("bv_tournament_location", data.tournamentLocation);
            } catch {}
          } else {
            setTournamentLocation("");
            try {
              localStorage.removeItem("bv_tournament_location");
            } catch {}
          }

          if (data.tournamentGender !== undefined) {
            setTournamentGender(data.tournamentGender);
            try {
              localStorage.setItem("bv_tournament_gender", data.tournamentGender);
            } catch {}
          } else {
            setTournamentGender("");
            try {
              localStorage.removeItem("bv_tournament_gender");
            } catch {}
          }
        } else {
          setAdmittedTeamsCount(null);
          setActiveTournamentConfig(null);
          setLoadedSaveName(null);
          setTournamentDate("");
          setTournamentGender("");
          setTournamentLocation("");
          try {
            localStorage.removeItem("bv_tournament_date");
            localStorage.removeItem("bv_tournament_gender");
            localStorage.removeItem("bv_tournament_location");
          } catch {}
        }
      },
      (error) => {
        console.error("Firestore sync error (config):", error);
      },
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AppUser);
        });
        list.sort((a, b) => a.username.localeCompare(b.username));
        setUsers(list);

        // Block simultaneous connections: disconnect older sessions if a newer one logs in
        if (currentUserRef.current) {
          const dbUser = list.find((u) => u.id === currentUserRef.current?.id);
          if (
            dbUser &&
            dbUser.activeSessionId &&
            dbUser.activeSessionId !== currentUserRef.current.activeSessionId
          ) {
            setCurrentUser(null);
            currentUserRef.current = null;
            setTimeout(() => {
              alert(
                "La tua sessione è stata terminata poiché è stato effettuato un nuovo accesso con lo stesso account da un altro dispositivo o browser.",
              );
            }, 0);
          }
        }
      },
      (error) => {
        console.error("Firestore sync error (users):", error);
      },
    );

    const unsubArchives = onSnapshot(
      collection(db, "archives"),
      (snapshot) => {
        const list: ArchivedTournament[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ArchivedTournament);
        });
        list.sort((a, b) => b.id.localeCompare(a.id));
        setArchives(list);
      },
      (error) => {
        console.error("Firestore sync error (archives):", error);
      },
    );

    const unsubSaves = onSnapshot(
      collection(db, "saves"),
      (snapshot) => {
        const list: ActiveTournamentSave[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ActiveTournamentSave);
        });
        list.sort((a, b) => {
          const timeA = a.timestamp || parseInt(a.id.replace("save-", "")) || 0;
          const timeB = b.timestamp || parseInt(b.id.replace("save-", "")) || 0;
          return timeB - timeA;
        });
        setSaves(list);
      },
      (error) => {
        console.error("Firestore sync error (saves):", error);
      },
    );

    return () => {
      unsubTeams();
      unsubMatches();
      unsubNotifs();
      unsubConfig();
      unsubUsers();
      unsubArchives();
      unsubSaves();
    };
  }, []);

  // Maintain local storage persistence cache as instant fallback
  useEffect(() => {
    localStorage.setItem("bv_teams", JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem("bv_matches", JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem("bv_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Sync logged user state to local caching
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("bv_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("bv_current_user");
    }
  }, [currentUser]);

  // Seed default admin in Firestore if user list is empty
  useEffect(() => {
    if (users.length === 0) {
      const seedDefaultAdmin = async () => {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          if (snapshot.empty) {
            const adminUser: AppUser = {
              id: "admin",
              username: "admin",
              password: "admin",
              role: "admin",
              createdAt: new Date().toLocaleDateString("it-IT"),
              telefono: "0000000000"
            };
            await setDoc(doc(db, "users", adminUser.id), adminUser);
            console.log("Pre-loaded root admin account successfully.");
          }
        } catch (err) {
          console.error("Bootstrapping default admin failed:", err);
        }
      };
      seedDefaultAdmin();
    }
  }, [users]);

  const handleRegisterRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanPassword = regPassword.trim();
    const cleanTelefono = regTelefono.trim();
    const cleanNome = regNome.trim();
    const cleanCognome = regCognome.trim();

    if (!cleanUsername || !cleanPassword || !cleanTelefono || !cleanNome || !cleanCognome) {
      setRegError("Tutti i campi obbligatori devono essere compilati.");
      return;
    }

    if (cleanUsername.length < 3) {
      setRegError("Il nome utente deve avere almeno 3 caratteri.");
      return;
    }

    // Uniqueness check
    if (users.some((u) => u.username.toLowerCase() === cleanUsername || u.id === cleanUsername)) {
      setRegError(`Il nome utente "${cleanUsername}" è già registrato.`);
      return;
    }

    const normRegPhone = normalizePhoneForComparison(cleanTelefono);
    const phoneExists = users.some((u) => {
      if (!u.telefono) return false;
      return normalizePhoneForComparison(u.telefono) === normRegPhone;
    });

    if (phoneExists) {
      setRegError(`Il numero di telefono "${cleanTelefono}" è già associato ad un utente registrato.`);
      return;
    }

    try {
      const newRequest: RegistrationRequest = {
        id: cleanUsername,
        username: cleanUsername,
        password: cleanPassword,
        role: regRole,
        nome: cleanNome,
        cognome: cleanCognome,
        telefono: cleanTelefono,
        createdAt: new Date().toLocaleDateString("it-IT"),
        status: "pending",
      };

      if (regGenere) {
        newRequest.genere = regGenere;
      }
      if (regDataNascita) {
        newRequest.dataNascita = regDataNascita;
      }

      await setDoc(doc(db, "registrationRequests", cleanUsername), newRequest);
      setRegSuccess(true);
      
      // Reset form
      setRegUsername("");
      setRegPassword("");
      setRegNome("");
      setRegCognome("");
      setRegTelefono("");
      setRegGenere("");
      setRegDataNascita("");
      setRegRole("reader");
    } catch (err: any) {
      console.error("Errore invio richiesta registrazione:", err);
      const errMsg = err?.message || String(err);
      setRegError(`Si è verificato un errore durante l'invio della richiesta: ${errMsg}`);
    }
  };

  useEffect(() => {
    if (admittedTeamsCount !== null) {
      localStorage.setItem(
        "bv_admitted_teams_count",
        JSON.stringify(admittedTeamsCount),
      );
    } else {
      localStorage.removeItem("bv_admitted_teams_count");
    }
  }, [admittedTeamsCount]);

  useEffect(() => {
    if (activeTournamentConfig !== null) {
      localStorage.setItem(
        "bv_active_tournament_config",
        JSON.stringify(activeTournamentConfig),
      );
    } else {
      localStorage.removeItem("bv_active_tournament_config");
    }
  }, [activeTournamentConfig]);

  useEffect(() => {
    if (loadedSaveName !== null) {
      localStorage.setItem("bv_loaded_save_name", loadedSaveName);
    } else {
      localStorage.removeItem("bv_loaded_save_name");
    }
  }, [loadedSaveName]);

  useEffect(() => {
    const isOrganizer =
      currentUser &&
      (currentUser.role === "admin" || currentUser.role === "collaborator");
    if (!isOrganizer) {
      const allowedTabs = ["teams", "standings", "notifications"];
      if (matches.length > 0) {
        allowedTabs.push("bracket");
      }
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab("teams");
      }
    }
  }, [currentUser, activeTab, matches.length]);

  const clearCollection = async (collectionName: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const promises = snap.docs.map((d) =>
        deleteDoc(doc(db, collectionName, d.id)),
      );
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
      title: "Nuova Iscrizione Completata! 🏝️",
      message: `La squadra "${newTeam.name}" (coppia: ${newTeam.player1} - ${newTeam.player2}) si è iscritta ufficialmente con livello di gioco: ${newTeam.level}.`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "system",
    };

    try {
      await setDoc(doc(db, "teams", newTeam.id), cleanObject(newTeam));
      await setDoc(
        doc(db, "notifications", addedNotif.id),
        cleanObject(addedNotif),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${newTeam.id}`);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    const isTournamentStarted = matches.some(
      (m) =>
        m.status === "completed" || m.status === "live" || m.sets.length > 0,
    );
    if (matches.length > 0 && isTournamentStarted) return;
    const deleted = teams.find((t) => t.id === id);
    if (!deleted) return;

    try {
      await deleteDoc(doc(db, "teams", id));
      const rmNotif: NotificationLog = {
        id: `notif-rm-${Date.now()}`,
        title: "Iscrizione cancellata 🗑️",
        message: `La squadra "${deleted.name}" si è ritirata dal torneo.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "system",
      };
      await setDoc(doc(db, "notifications", rmNotif.id), cleanObject(rmNotif));

      if (
        matches.length > 0 &&
        !isTournamentStarted &&
        activeTournamentConfig
      ) {
        const remainingTeams = teams.filter((t) => t.id !== id);
        await handleGenerateTournament(activeTournamentConfig, remainingTeams);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${id}`);
    }
  };

  const handleEditTeam = async (updatedTeam: Team) => {
    const isTournamentStarted = matches.some(
      (m) =>
        m.status === "completed" || m.status === "live" || m.sets.length > 0,
    );
    if (matches.length > 0 && isTournamentStarted) return;

    const updateNotif: NotificationLog = {
      id: `notif-edit-${Date.now()}`,
      title: "Squadra Modificata ✏️",
      message: `I dettagli della squadra "${updatedTeam.name}" sono stati aggiornati con successo.`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "system",
    };

    try {
      await setDoc(doc(db, "teams", updatedTeam.id), cleanObject(updatedTeam));
      await setDoc(
        doc(db, "notifications", updateNotif.id),
        cleanObject(updateNotif),
      );

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
          await setDoc(
            doc(db, "matches", m.id),
            cleanObject({
              ...m,
              team1: newTeam1,
              team2: newTeam2,
            }),
          );
        }
      });
      await Promise.all(matchesPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teams/${updatedTeam.id}`);
    }
  };

  const handleLoadDemoTeams = async (count: number) => {
    const selectedDemos: Team[] = [];
    const adjective = [
      "Sand Stormers",
      "Golden Blocks",
      "Sky Jumpers",
      "Beach Aces",
      "Wave Riders",
      "Spike Kings",
      "Sideout Pros",
      "Sun Blockers",
      "Vento d'Estate",
      "Pazzi della Sabbia",
      "Beach Boys",
      "Hot Spikes",
      "Bassa Difesa",
      "Sabbia Caliente",
      "Net Rippers",
      "Volley Monsters",
      "Sea Wolves",
      "Coastal Giants",
      "Sardine Smashers",
      "Dune Defenders",
      "Ocean Breakers",
      "Tidal Voyagers",
    ];
    const names = [
      "Alessandro",
      "Marco",
      "Filippo",
      "Guido",
      "Luca",
      "Matteo",
      "Simone",
      "Davide",
      "Claudio",
      "Fabio",
      "Andrea",
      "Giorgio",
      "Stefano",
      "Roberto",
      "Enrico",
      "Gianni",
      "Emanuele",
      "Pietro",
      "Daniele",
      "Lorenzo",
      "Alberto",
      "Federico",
      "Gabriele",
      "Valerio",
      "Michele",
      "Salvatore",
      "Vincenzo",
      "Antonio",
      "Giuseppe",
      "Fabrizio",
      "Christian",
      "Manuel",
    ];
    const surnames = [
      "Rossi",
      "Bianchi",
      "Neri",
      "Verdi",
      "Ferrari",
      "Colombo",
      "Ricci",
      "Bruno",
      "Moretti",
      "Rizzo",
      "Mancini",
      "Costa",
      "Gallo",
      "Conti",
      "Villa",
      "Serra",
      "Gatti",
      "Fontana",
      "Marini",
      "Greco",
      "Barbieri",
      "Leone",
      "Longo",
      "Martinelli",
      "Esposito",
      "Romano",
      "Vitale",
      "De Luca",
      "Cozza",
      "Russo",
      "Bernardi",
      "Pellegrini",
    ];
    const levels: ("Beginner" | "Bronze" | "Silver" | "Gold")[] = [
      "Gold",
      "Silver",
      "Bronze",
      "Beginner",
    ];

    for (let i = 0; i < count; i++) {
      if (i < DEMO_TEAMS.length) {
        selectedDemos.push(getInitialTeamStats(DEMO_TEAMS[i] as any));
      } else {
        const p1Name = names[i % names.length];
        const p1Surname = surnames[(i + 3) % surnames.length];
        const p2Name = names[(i + 7) % names.length];
        const p2Surname = surnames[(i + 11) % surnames.length];
        const level = levels[i % levels.length];

        const dateObj = new Date(
          new Date("2026-05-26T10:00:00").getTime() + i * 15 * 60000,
        );
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
        const dd = String(dateObj.getDate()).padStart(2, "0");
        const hh = String(dateObj.getHours()).padStart(2, "0");
        const minVal = String(dateObj.getMinutes()).padStart(2, "0");
        const registeredStr = `${yyyy}-${mm}-${dd} ${hh}:${minVal}`;

        const generatedTeam: Omit<
          Team,
          | "wins"
          | "losses"
          | "setsWon"
          | "setsLost"
          | "pointsWon"
          | "pointsLost"
          | "points"
        > = {
          id: `t${i + 1}`,
          name: `${adjective[i % adjective.length]} ${Math.floor(i / adjective.length) + 1}`,
          player1: `${p1Name} ${p1Surname}`,
          player2: `${p2Name} ${p2Surname}`,
          level,
          phone: `33${Math.floor(10000000 + Math.random() * 90000000)
            .toString()
            .substring(0, 8)}`,
          email: `${p1Name.toLowerCase()}.${p1Surname.toLowerCase()}@example.com`,
          phone2: `34${Math.floor(10000000 + Math.random() * 90000000)
            .toString()
            .substring(0, 8)}`,
          email2: `${p2Name.toLowerCase()}.${p2Surname.toLowerCase()}@example.com`,
          registeredAt: registeredStr,
        };
        selectedDemos.push(getInitialTeamStats(generatedTeam as any));
      }
    }

    const demNotif: NotificationLog = {
      id: `notif-demo-${Date.now()}`,
      title: "Squadre Demo Precaricate 🏐",
      message: `Il roster è stato caricato con ${count} coppie di beach volley. Il tabellone è ora pronto per essere configurato!`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "system",
    };

    try {
      await clearCollection("teams");
      await clearCollection("matches");
      await clearCollection("notifications");
      await deleteDoc(doc(db, "config", "settings"));

      const teamPromises = selectedDemos.map((team) =>
        setDoc(doc(db, "teams", team.id), cleanObject(team)),
      );
      await Promise.all(teamPromises);
      await setDoc(
        doc(db, "notifications", demNotif.id),
        cleanObject(demNotif),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "teams_demo");
    }
  };

  const handleClearAllTeams = async () => {
    try {
      await clearCollection("teams");
      await clearCollection("matches");
      await clearCollection("notifications");
      await deleteDoc(doc(db, "config", "settings"));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "all");
    }
  };

  // TOURNAMENT BRACKET GENERATION (Supports Direct Elimination, Pool Play, and Combined Phases)
  const handleGenerateTournament = async (
    config: {
      name: string;
      formula: "direct" | "pools" | "combined" | "double_elim";
      teamsCount: number;
      groupCount: number;
      courtCount: number;
      pointsPerSet?: 15 | 21;
      maxSets?: 1 | 3;
      sfPointsPerSet?: 15 | 21;
      sfMaxSets?: 1 | 3;
      include3rd4th?: boolean;
      breakStart?: string;
      breakEnd?: string;
      durationSet1Points15?: number;
      durationSet1Points21?: number;
      durationSet3Points15?: number;
      durationSet3Points21?: number;
    },
    teamsToUse: Team[] = teams,
  ) => {
    const startHour = "09:00";
    let matchDuration = 40;
    if (config.maxSets === 1) {
      if (config.pointsPerSet === 15)
        matchDuration = config.durationSet1Points15 ?? 15;
      else if (config.pointsPerSet === 21)
        matchDuration = config.durationSet1Points21 ?? 20;
    } else if (config.maxSets === 3) {
      if (config.pointsPerSet === 15)
        matchDuration = config.durationSet3Points15 ?? 45;
      else if (config.pointsPerSet === 21)
        matchDuration = config.durationSet3Points21 ?? 50;
    }

    // Exclude withdrawn/retired teams from tournament generation, so they aren't seeded or created in pools
    const activeTeamsToUse = teamsToUse.filter(
      (t) => !t.isWithdrawn && !t.name.endsWith(" [RITIRATA]"),
    );

    // Sort teams by the centralized Entry List ranking criteria: Game Level, then registration date/time.
    const sortedTeams = sortTeamsByEntryList<Team>(activeTeamsToUse);

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

    if (config.formula === "double_elim") {
      // 4. Vincenti e Perdenti (Double Elimination) FOR exactly 8 teams
      generatedMatches = generateDoubleEliminationBracket(
        clearedTeams,
        startHour,
        matchDuration,
        config.pointsPerSet,
        config.maxSets,
        config.sfPointsPerSet,
        config.sfMaxSets,
        config.courtCount,
        config.breakStart,
        config.breakEnd,
      );

      // Remove any group association in play
      updatedTeams = clearedTeams.map((t) => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone Vincenti & Perdenti "${config.name}" Pubblicato!`,
        message: `È stata generata la modalità a doppia eliminazione con tabellone di qualificazione, vincenti, perdenti, semifinali e finalissima! Le sfide iniziano sul sabbioso dalle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "schedule_change",
      };
    } else if (config.formula === "direct") {
      // 1. Direct Elimination ONLY
      const seededMatches = generateDirectEliminationBracket(
        clearedTeams,
        config.teamsCount as number,
        startHour,
        matchDuration,
        config.courtCount,
        config.pointsPerSet,
        config.maxSets,
        config.sfPointsPerSet,
        config.sfMaxSets,
        config.include3rd4th !== false,
        config.breakStart,
        config.breakEnd,
        config,
      );

      generatedMatches = seededMatches.map((m) => ({
        ...m,
        phase: "eliminazione" as const,
        groupName: undefined,
      }));

      // Remove any group association in direct play
      updatedTeams = clearedTeams.map((t) => {
        const { group, ...rest } = t;
        return rest as Team;
      });

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏆 Tabellone "${config.name}" Pubblicato!`,
        message: `È stata generata la fase a eliminazione diretta per ${config.teamsCount} squadre. Le prime partite inizieranno sul sabbioso alle ore ${startHour}.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "schedule_change",
      };
    } else if (config.formula === "pools") {
      // 2. Pools / Group stage ONLY (Fase a Gironi)
      const chronologicallySortedPools = [...clearedTeams].sort((a, b) =>
        a.registeredAt.localeCompare(b.registeredAt),
      );
      const admittedPoolsRaw = chronologicallySortedPools.slice(
        0,
        config.teamsCount,
      );
      const selectedTeams = sortTeamsByEntryList(admittedPoolsRaw);
      let byeCount = 1;
      while (selectedTeams.length < config.teamsCount) {
        selectedTeams.push({
          id: `bye_pool_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: "N/A",
          player2: "N/A",
          level: "Beginner",
          registeredAt: "2026-05-27",
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
      updatedTeams = clearedTeams.map((t) => {
        const foundGroupName = Object.keys(groups).find((groupKey) =>
          groups[groupKey].some((gt) => gt.id === t.id),
        );
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
        config.maxSets,
        config.breakStart,
        config.breakEnd,
      );

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🏐 Gironi del Torneo "${config.name}" Generati!`,
        message: `Sono stati configurati ${config.groupCount} gironi all'italiana (${Object.keys(
          groups,
        )
          .map((k) => `${k}: ${groups[k].length} sq.`)
          .join(", ")}). Controlla il calendario gare!`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "schedule_change",
      };
    } else {
      // 3. Combined: Phase 1 (Gironi) + Phase 2 (Playoffs Bracket)
      const chronologicallySortedCombined = [...clearedTeams].sort((a, b) =>
        a.registeredAt.localeCompare(b.registeredAt),
      );
      const admittedCombinedRaw = chronologicallySortedCombined.slice(
        0,
        config.teamsCount,
      );
      const selectedTeams = sortTeamsByEntryList(admittedCombinedRaw);
      let byeCount = 1;
      while (selectedTeams.length < config.teamsCount) {
        selectedTeams.push({
          id: `bye_combined_${selectedTeams.length}`,
          name: `BYE ${byeCount++}`,
          player1: "N/A",
          player2: "N/A",
          level: "Beginner",
          registeredAt: "2026-05-27",
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

      updatedTeams = clearedTeams.map((t) => {
        const foundGroupName = Object.keys(groups).find((groupKey) =>
          groups[groupKey].some((gt) => gt.id === t.id),
        );
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
        config.maxSets,
        config.breakStart,
        config.breakEnd,
      );

      initNotif = {
        id: `notif-init-${Date.now()}`,
        title: `🥇 Torneo "${config.name}" - Fasi Multiple Iniziate!`,
        message: `Fase 1 (Gironi): ${config.groupCount} gironi generati. I migliori qualificati accederanno alla Fase 2 (Tabellone Playoff ad Eliminazione). In bocca al lupo!`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "schedule_change",
      };
    }

    try {
      // Write config settings in config settings doc
      await setDoc(
        doc(db, "config", "settings"),
        cleanObject({
          admittedTeamsCount: config.teamsCount,
          activeTournamentConfig: config,
        }),
      );

      // Clear existing matches
      await clearCollection("matches");

      // Write updated teams in DB
      const teamPromises = updatedTeams.map((t) =>
        setDoc(doc(db, "teams", t.id), cleanObject(t)),
      );
      await Promise.all(teamPromises);

      // Write matches in DB
      const matchPromises = generatedMatches.map((m) =>
        setDoc(doc(db, "matches", m.id), cleanObject(m)),
      );
      await Promise.all(matchPromises);

      // Push notification
      await setDoc(
        doc(db, "notifications", initNotif.id),
        cleanObject(initNotif),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "tournament_generation");
    }

    // Force focus to bracket/matches viewing tab
    setActiveTab("bracket");
  };

  const handleSubstituteTeam = async (
    withdrawnTeamId: string,
    promotedTeamId: string,
  ) => {
    const withdrawnTeam = teams.find((t) => t.id === withdrawnTeamId);
    const promotedTeam = teams.find((t) => t.id === promotedTeamId);
    if (!withdrawnTeam || !promotedTeam) return;

    // Mark withdrawn team and update promoted team without swapping registeredAt timestamps
    const updatedTeams = teams.map((t) => {
      if (t.id === withdrawnTeamId) {
        return {
          ...t,
          isWithdrawn: true,
          replacedByTeamId: promotedTeamId,
          replacedByTeamName: promotedTeam.name,
          name: t.name.endsWith(" [RITIRATA]")
            ? t.name
            : `${t.name} [RITIRATA]`,
        };
      }
      if (t.id === promotedTeamId) {
        const cleanName = t.name.replace(" [RITIRATA]", "");
        return {
          ...t,
          subenteredForTeamId: withdrawnTeamId,
          subenteredForTeamName: withdrawnTeam.name,
          name: cleanName,
        };
      }
      return t;
    });

    const swapNotif: NotificationLog = {
      id: `notif-sub-${Date.now()}`,
      title: "🔄 Sostituzione per Ritiro",
      message: `La squadra "${withdrawnTeam.name}" si è ritirata ed è stata sostituita da "${promotedTeam.name}". Il roster e il calendario del torneo sono stati aggiornati!`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "schedule_change",
    };

    try {
      await setDoc(
        doc(db, "notifications", swapNotif.id),
        cleanObject(swapNotif),
      );

      // Save full individual changes immediately to Firestore
      const teamPromises = updatedTeams.map((t) =>
        setDoc(doc(db, "teams", t.id), cleanObject(t)),
      );
      await Promise.all(teamPromises);

      if (activeTournamentConfig) {
        await handleGenerateTournament(activeTournamentConfig, updatedTeams);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "team_substitution");
    }
  };

  const handleUpdateMatches = async (newMatches: Match[]) => {
    try {
      if (newMatches.length === 0) {
        await deleteDoc(doc(db, "config", "settings"));
        await clearCollection("matches");
      } else {
        const resolved = recalculateTournamentStages(
          newMatches,
          teams,
          activeTournamentConfig?.breakStart,
          activeTournamentConfig?.breakEnd,
          activeTournamentConfig,
        );
        const promises = resolved.map((m) =>
          setDoc(doc(db, "matches", m.id), cleanObject(m)),
        );
        await Promise.all(promises);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "matches_update");
    }
  };

  // EXPLICIT NOTIFICATION EMITTERS
  const handleAddNotification = async (notification: NotificationLog) => {
    try {
      await setDoc(
        doc(db, "notifications", notification.id),
        cleanObject(notification),
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `notifications/${notification.id}`,
      );
    }
  };

  const handleClearNotifications = async () => {
    try {
      await clearCollection("notifications");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "notifications");
    }
  };

  const handleClearAllTournamentData = async () => {
    try {
      await clearCollection("matches");
      await clearCollection("notifications");
      await deleteDoc(doc(db, "config", "settings"));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "all_tournament_data");
    }
  };

  const handleSaveActiveTournament = async (
    nameToUse: string,
    overwriteSaveId?: string,
  ) => {
    const saveId = overwriteSaveId || `save-${Date.now()}`;
    const newSave: ActiveTournamentSave = {
      id: saveId,
      name: nameToUse,
      date: new Date().toLocaleDateString("it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      formula: activeTournamentConfig?.formula || "N/A",
      teamsCount: teams.length,
      teams: teams,
      matches: matches,
      activeTournamentConfig: activeTournamentConfig || {
        name: nameToUse,
        formula: "N/A",
      },
      admittedTeamsCount: admittedTeamsCount,
      savedBy: currentUser?.username || "admin",
      notifications: notifications,
      timestamp: Date.now(),
      teamUsers: [],
    };
    try {
      await setDoc(doc(db, "saves", saveId), cleanObject(newSave));
      // Also update the loaded save name configuration in setting doc
      await setDoc(
        doc(db, "config", "settings"),
        cleanObject({
          admittedTeamsCount: admittedTeamsCount,
          activeTournamentConfig: activeTournamentConfig || {
            name: nameToUse,
            formula: "N/A",
          },
          loadedSaveName: nameToUse,
        }),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `saves/${saveId}`);
    }
  };

  const handleRestoreTournament = async (save: ActiveTournamentSave) => {
    try {
      await clearCollection("teams");
      await clearCollection("matches");
      await clearCollection("notifications");

      const teamPromises = save.teams.map((t) =>
        setDoc(doc(db, "teams", t.id), cleanObject(t)),
      );
      await Promise.all(teamPromises);

      const matchPromises = save.matches.map((m) =>
        setDoc(doc(db, "matches", m.id), cleanObject(m)),
      );
      await Promise.all(matchPromises);

      if (save.notifications && save.notifications.length > 0) {
        const notifPromises = save.notifications.map((n) =>
          setDoc(doc(db, "notifications", n.id), cleanObject(n)),
        );
        await Promise.all(notifPromises);
      }

      await setDoc(
        doc(db, "config", "settings"),
        cleanObject({
          admittedTeamsCount: save.admittedTeamsCount,
          activeTournamentConfig: save.activeTournamentConfig,
          loadedSaveName: save.name,
        }),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `restore/${save.id}`);
    }
  };

  const handleDeleteSave = async (id: string) => {
    try {
      await deleteDoc(doc(db, "saves", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `saves/${id}`);
    }
  };

  // Counts of pending notifications or live games to show alert counters
  const activeLiveGamesCount = matches.filter(
    (m) => m.status === "live",
  ).length;

  if (currentUser && currentUser.role !== "admin" && systemStatus === "offline") {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 font-sans antialiased flex flex-col items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-700"
        >
          <motion.div 
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, repeatDelay: 5 }}
            className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
             <div className="text-4xl">😴</div>
          </motion.div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Torneo a Riposo</h2>
          <p className="text-slate-400 font-medium leading-relaxed mb-8">
            Al momento non è attivo nessun torneo. La direzione gara sta riposando... Torna a controllare tra poco!
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
          >
            Disconnetti
          </button>
        </motion.div>
      </motion.div>
    );
  }

  if (!currentUser) {
    if (isRegistering) {
      return (
        <div
          id="auth-gate-root"
          className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100 text-slate-800 font-sans antialiased flex flex-col items-center justify-center p-4 md:border-8 border-sky-450"
        >
          <motion.div
            id="register-box"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl border-4 border-sky-400 p-8 w-full max-w-md font-sans space-y-6 relative overflow-hidden"
          >
            {regSuccess ? (
              <div className="text-center space-y-5 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Richiesta Inviata! 🎉
                </h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-sm mx-auto">
                  Grazie per la registrazione! Gli amministratori approveranno la tua richiesta e riceverai una conferma su WhatsApp non appena l'account sarà attivo.
                </p>
                <button
                  id="btn-back-to-login-success"
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setRegSuccess(false);
                  }}
                  className="mt-4 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Torna all'Accesso
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black tracking-tight uppercase italic leading-none text-sky-850">
                    Registrati
                  </h2>
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mt-2">
                    📝 Richiesta di Registrazione
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                    Inserisci i tuoi dati personali per richiedere l'accesso. Un amministratore approverà il tuo account.
                  </p>
                </div>

                <form
                  id="register-request-form"
                  onSubmit={handleRegisterRequest}
                  className="space-y-4 text-slate-800"
                >
                  {regError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl p-3.5 text-xs font-bold text-center leading-relaxed">
                      ⚠️ {regError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Nome
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Mario"
                        value={regNome}
                        onChange={(e) => setRegNome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Cognome
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Rossi"
                        value={regCognome}
                        onChange={(e) => setRegCognome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Telefono (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="3456789012"
                        value={regTelefono}
                        onChange={(e) => setRegTelefono(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-mono font-bold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Data di Nascita
                      </label>
                      <input
                        type="date"
                        required
                        value={regDataNascita}
                        onChange={(e) => setRegDataNascita(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-mono font-bold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Genere
                      </label>
                      <select
                        value={regGenere}
                        onChange={(e) => setRegGenere(e.target.value as "M" | "F" | "")}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm cursor-pointer"
                      >
                        <option value="">Seleziona</option>
                        <option value="M">Maschio (M)</option>
                        <option value="F">Femmina (F)</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Ruolo
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm cursor-pointer"
                      >
                        <option value="reader">Lettore (READER)</option>
                        <option value="ATLETA">Atleta (ATLETA)</option>
                        <option value="collaborator">Collaboratore (COLLABORATOR)</option>
                        <option value="admin">Amministratore (ADMIN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="mario_rossi"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-mono font-bold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 font-mono font-bold bg-slate-50 text-slate-805 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      id="btn-cancel-register"
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-xs tracking-wider py-3 rounded-2xl border-b-4 border-slate-300 transition-all cursor-pointer text-center"
                    >
                      Annulla
                    </button>
                    <button
                      id="btn-submit-register"
                      type="submit"
                      className="w-1/2 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-xs tracking-wider py-3 rounded-2xl border-b-4 border-sky-700 transition-all cursor-pointer text-center"
                    >
                      Invia 📝
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      );
    }

    return (
      <div
        id="auth-gate-root"
        className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100 text-slate-800 font-sans antialiased flex flex-col items-center justify-center p-4 md:border-8 border-sky-450"
      >
        <motion.div
          id="login-box"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl border-4 border-amber-400 p-8 w-full max-w-sm font-sans space-y-6 relative overflow-hidden"
        >
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-white border-2 border-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-md overflow-hidden">
              <img
                src={logoUrl}
                alt="WSICILY Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
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
              L'accesso all'applicazione è limitato agli utenti autorizzati.
              Inserisci le tue credenziali per visualizzare e gestire i tornei.
            </p>
          </div>

          <form
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              setLoginError(null);

              const typedUser = loginUsername.trim().toLowerCase();
              const typedPass = loginPassword.trim();

              // 1. Search in active users
              const activeUser = users.find(
                (u) =>
                  u.username.trim().toLowerCase() === typedUser ||
                  u.id === typedUser ||
                  (u.telefono && u.telefono === typedUser),
              );

              // 2. Search in all saved tournaments (which are not currently active)
              let savedUser: AppUser | undefined = undefined;
              for (const save of saves) {
                if (save.teamUsers) {
                  const found = save.teamUsers.find(
                    (u) =>
                      u.username.trim().toLowerCase() === typedUser ||
                      u.id === typedUser ||
                      (u.telefono && u.telefono === typedUser),
                  );
                  if (found) {
                    savedUser = found;
                    break;
                  }
                }
              }

              // 3. Evaluate matching cases
              if (!activeUser && !savedUser) {
                // If username is not found anywhere
                setLoginError(
                  "Credenziali non corrette o utente non autorizzato.",
                );
              } else {
                // User exists either in active or saved
                const isActivePassCorrect =
                  activeUser && activeUser.password === typedPass;
                const isSavedPassCorrect =
                  savedUser && savedUser.password === typedPass;

                if (isActivePassCorrect) {
                  // The user exists and correct password: allow access with session tracking
                  const newSessionId =
                    Math.random().toString(36).slice(2) + Date.now().toString();
                  const updatedUser = {
                    ...activeUser,
                    activeSessionId: newSessionId,
                    lastActiveAt: Date.now(),
                  };

                  // Persist the active session info to database so other active connections of the same user are closed
                  const userDocRef = doc(db, "users", activeUser.id);
                  setDoc(userDocRef, cleanObject(updatedUser))
                    .then(() => {
                      setCurrentUser(updatedUser);
                      setLoginUsername("");
                      setLoginPassword("");
                    })
                    .catch((err) => {
                      console.error("Errore salvataggio sessione utente:", err);
                      // Fallback to allow access if database is writing
                      setCurrentUser(updatedUser);
                      setLoginUsername("");
                      setLoginPassword("");
                    });
                } else if (isSavedPassCorrect) {
                  // Correct password but associated with an inactive saved tournament: return inactive tournament error
                  setLoginError("Torneo richiesto non attivo.");
                } else {
                  // Incorrect password
                  setLoginError(
                    "Credenziali non corrette o utente non autorizzato.",
                  );
                }
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
              <label
                htmlFor="login-input-username"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
              >
                Telefono / Username
              </label>
              <input
                id="login-input-username"
                type="text"
                required
                placeholder="Inserisci numero di telefono o username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 font-semibold bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1 text-left">
              <label
                htmlFor="login-input-password"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
              >
                Password dell'Operatore
              </label>
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

            <div className="flex items-center my-3">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Oppure</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              id="btn-toggle-register"
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setRegError(null);
                setRegSuccess(false);
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-xs tracking-wider py-3.5 rounded-2xl border-b-4 border-sky-700 transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Richiedi Registrazione 📝
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const isTeamUser = false;
  const isTeamAuthorized = true;

  return (
    <div
      id="main-beach-app-shell"
      className="min-h-screen bg-amber-50 text-slate-800 font-sans antialiased pb-0 border-0 md:border-8 border-sky-400 flex flex-col selection:bg-orange-200"
    >
      {/* Main Header Container */}
      <header
        id="beach-app-header-sec"
        className="bg-sky-500 text-white shadow-lg border-b-4 border-sky-600"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white border-2 border-sky-400/50 rounded-2xl overflow-hidden shadow-md shrink-0 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="WSICILY Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight uppercase italic leading-none text-white drop-shadow-sm whitespace-nowrap">
                WSicily beach volley hub
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-sky-100 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                {isEditingHeaderLocation ? (
                  <input
                    type="text"
                    value={tempHeaderLocation}
                    onChange={(e) => setTempHeaderLocation(e.target.value)}
                    onBlur={handleSaveHeaderLocation}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveHeaderLocation();
                      } else if (e.key === "Escape") {
                        setIsEditingHeaderLocation(false);
                      }
                    }}
                    autoFocus
                    className="bg-sky-600 text-white border-2 border-amber-300 rounded px-2 py-0.5 text-[10px] md:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-300 shadow-inner w-44 md:w-56"
                    placeholder="Inserisci luogo torneo..."
                  />
                ) : (
                  <span
                    onClick={() => {
                      if (currentUser?.role === "admin" || currentUser?.role === "collaborator") {
                        setTempHeaderLocation(tournamentLocation || "AREA CAMPIONATI SU SABBIA");
                        setIsEditingHeaderLocation(true);
                      }
                    }}
                    className={`flex items-center gap-1 select-none ${
                      (currentUser?.role === "admin" || currentUser?.role === "collaborator")
                        ? "hover:text-amber-200 cursor-pointer transition-colors"
                        : ""
                    }`}
                    title={
                      (currentUser?.role === "admin" || currentUser?.role === "collaborator")
                        ? "Clicca per modificare il luogo del torneo 🏖️"
                        : undefined
                    }
                  >
                    <span>🏖️ {tournamentLocation ? tournamentLocation.toUpperCase() : "AREA CAMPIONATI SU SABBIA"}</span>
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
                <span>REAL-TIME DECK</span>
              </p>
            </div>
          </div>

          {/* Top Bar Controls Container */}
          <div className="flex items-center justify-between w-full overflow-x-auto no-scrollbar gap-2">
             
             {/* Tournament Info */}
             <div className="flex items-center gap-1.5 md:gap-2 bg-sky-800/60 backdrop-blur-md border-2 border-sky-400/40 py-1.5 px-2 md:px-3 rounded-2xl shadow-xl shrink-0">
               {/* System Status Toggle */}
               {currentUser?.role === "admin" && (
                  <>
                    <div className="flex items-center px-0.5 shrink-0">
                      <button
                        onClick={handleToggleSystemStatus}
                        disabled={!isStatusLoaded}
                        title="Cambia stato torneo"
                        className={`h-7 md:h-8 px-2 flex items-center justify-center text-[9px] md:text-[10px] font-black rounded-lg border-2 transition-all cursor-pointer shadow-md ${
                          !isStatusLoaded
                            ? "bg-slate-500/20 text-slate-300 border-slate-500/50 cursor-wait"
                            : systemStatus === "online"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500 hover:text-white"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500 hover:text-white"
                        }`}
                      >
                        {!isStatusLoaded
                          ? "⏳ Caricamento..."
                          : systemStatus === "online"
                            ? "🟢 ONLINE"
                            : "🔴 OFFLINE"}
                      </button>
                    </div>
                    <div className="h-6 md:h-8 w-px bg-sky-400/40 shrink-0"></div>
                  </>
               )}

               {/* Squadre */}
               <div className="flex flex-col items-center px-0.5 md:px-1 shrink-0">
                  <span className="text-sky-200 font-extrabold text-[8px] md:text-[9px] uppercase tracking-wider mb-0.5">Squadre</span>
                  <span className="font-black text-orange-300 text-xs md:text-sm">{teams.length}</span>
               </div>
               
               <div className="h-6 md:h-8 w-px bg-sky-400/40 shrink-0"></div>

               {/* Stato Cup */}
               <div className="flex flex-col items-center px-0.5 md:px-1 shrink-0">
                  <div className="flex items-center gap-1.5 mb-1">
                     <span className="text-sky-200 font-extrabold text-[8px] md:text-[9px] uppercase tracking-wider">
                       Stato Cup
                     </span>
                  </div>
                  <span className="font-bold text-white uppercase italic text-[10px] md:text-[11px] leading-none">
                    {matches.length > 0
                      ? matches.every((m) => m.status === "completed")
                        ? "FINITO 🎉"
                        : "IN CORSO 🏖️"
                      : "SETUP 🛠️"}
                  </span>
               </div>

               {activeLiveGamesCount > 0 && (
                   <>
                     <div className="h-6 md:h-8 w-px bg-sky-400/40 shrink-0"></div>
                     <div className="flex items-center px-0.5 shrink-0">
                       <span className="flex items-center gap-1.5 bg-orange-500 text-white px-1.5 py-1 md:px-2 md:py-1 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-wider animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.6)]">
                         <span className="h-1.5 w-1.5 rounded-full bg-white block animate-ping"></span>
                         {activeLiveGamesCount} LIVE
                       </span>
                     </div>
                   </>
               )}
             </div>

             {/* User Info */}
             {currentUser && (
               <div className="flex items-center gap-1.5 md:gap-2 bg-sky-800/60 backdrop-blur-md border-2 border-sky-400/40 py-1.5 px-2 md:px-3 rounded-2xl shadow-xl shrink-0">
                  <div className="flex flex-col text-right px-0.5 shrink-0">
                     <span className="font-extrabold text-amber-300 text-[10px] md:text-[11px] truncate max-w-[80px] md:max-w-[120px] leading-tight drop-shadow-sm">
                       {currentUser.username}
                     </span>
                     <div className="flex items-center justify-end gap-1 mt-1">
                       <span className="text-[8px] md:text-[9px] text-sky-200 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className={`w-1 h-1 rounded-full animate-pulse ${currentUser.role === 'admin' ? 'bg-fuchsia-400' : 'bg-emerald-400'}`}></span>
                          {currentUser.role === "admin"
                            ? "Admin"
                            : currentUser.role === "collaborator"
                              ? "Collab"
                              : currentUser.role === "ATLETA"
                                ? "Atleta"
                                : "Lettore"}
                       </span>
                     </div>
                  </div>
                  
                  <div className="h-6 md:h-8 w-px bg-sky-400/40 shrink-0"></div>

                  <button
                    onClick={() => {
                      handleLogout();
                      if (activeTab === "users" || activeTab === "archive") {
                        setActiveTab("teams");
                      }
                    }}
                    className="bg-sky-900/60 hover:bg-rose-600 text-sky-100 hover:text-white p-1.5 md:p-2 rounded-xl transition-all border border-sky-400/30 hover:border-rose-500/50 group shadow-md shrink-0"
                    title="Disconnetti"
                  >
                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
               </div>
             )}
          </div>
        </div>

        {/* riga con le informazioni dei tornei e genere */}
        <div id="tournament-metadata-subbar" className="bg-sky-600/60 border-t border-sky-400/20 py-2 px-4 md:px-6 text-white text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center flex-wrap gap-2 text-xs md:text-sm font-semibold">
            {isEditingTournamentInfo ? (
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-300 shrink-0" />
                  <span className="text-sky-100 font-bold uppercase tracking-wider text-[10px]">Data:</span>
                  <input
                    type="text"
                    placeholder="Es. 28 Giugno 2026 o data prevista"
                    value={editTournamentDate}
                    onChange={(e) => setEditTournamentDate(e.target.value)}
                    className="bg-white text-slate-800 px-3 py-1 rounded-xl border border-sky-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-300 w-48 shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sky-100 font-bold uppercase tracking-wider text-[10px]">Genere:</span>
                  <select
                    value={editTournamentGender}
                    onChange={(e) => setEditTournamentGender(e.target.value as any)}
                    className="bg-white text-slate-800 px-3 py-1 rounded-xl border border-sky-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner"
                  >
                    <option value="">Non Specificato</option>
                    <option value="maschile">Maschile ♂️</option>
                    <option value="misto">Misto ⚧️</option>
                    <option value="femminile">Femminile ♀️</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveTournamentInfo}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" /> Salva
                  </button>
                  <button
                    onClick={() => setIsEditingTournamentInfo(false)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" /> Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 w-full">
                <div className="flex items-center gap-2 bg-sky-700/40 px-3 py-1.5 rounded-xl border border-sky-400/20 shadow-inner">
                  <Calendar className="w-4 h-4 text-orange-300 shrink-0" />
                  <span className="text-sky-200 font-bold uppercase tracking-wider text-[10px]">Data:</span>
                  <span className="font-extrabold">
                    {tournamentDate ? tournamentDate : <span className="text-sky-200/60 italic font-medium">Non configurata</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-sky-700/40 px-3 py-1.5 rounded-xl border border-sky-400/20 shadow-inner">
                  <span className="text-sky-200 font-bold uppercase tracking-wider text-[10px]">Genere:</span>
                  <span className="font-extrabold uppercase tracking-wide flex items-center gap-1">
                    {tournamentGender === "maschile" && "♂️ Maschile"}
                    {tournamentGender === "misto" && "⚧️ Misto"}
                    {tournamentGender === "femminile" && "♀️ Femminile"}
                    {!tournamentGender && <span className="text-sky-200/60 italic font-medium">Non specificato</span>}
                  </span>
                </div>

                {(currentUser?.role === "admin" || currentUser?.role === "collaborator") && (
                  <button
                    onClick={() => {
                      setEditTournamentDate(tournamentDate || "");
                      setEditTournamentLocation(tournamentLocation || "");
                      setEditTournamentGender(tournamentGender || "");
                      setIsEditingTournamentInfo(true);
                    }}
                    className="bg-sky-700/50 hover:bg-sky-850 text-sky-100 hover:text-white p-2 rounded-xl flex items-center justify-center border border-sky-400/30 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Modifica impostazioni torneo"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Tab Controls Layout */}
        {(!isTeamUser || isTeamAuthorized) && (
          <div className="bg-sky-600/30 border-t border-sky-400/30 py-2.5 md:py-3">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <nav
                id="app-nav-row"
                className="flex overflow-x-auto gap-2 md:gap-3 py-1 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {(() => {
                  const isOrganizer =
                    currentUser &&
                    (currentUser.role === "admin" ||
                      currentUser.role === "collaborator");
                  let navItems = [
                    {
                      id: "teams",
                      label: "Lista Ingresso",
                      count: teams.length,
                      icon: <Users className="w-3.5 h-3.5" />,
                    },
                    ...(isOrganizer || matches.length > 0
                      ? [
                          {
                            id: "bracket",
                            label: "Tabellone",
                            count: matches.length,
                            icon: <Award className="w-3.5 h-3.5" />,
                          },
                        ]
                      : []),
                    {
                      id: "standings",
                      label: "Classifiche",
                      icon: <TrendingUp className="w-3.5 h-3.5" />,
                    },
                    {
                      id: "notifications",
                      label: "Notifiche",
                      count: notifications.length,
                      icon: <Bell className="w-3.5 h-3.5" />,
                    },
                  ];
                  if (currentUser && currentUser.role === "admin") {
                    navItems.push({
                      id: "archive",
                      label: "Archivio Tornei",
                      count: archives.length,
                      icon: <Trophy className="w-3.5 h-3.5" />,
                    });
                    navItems.push({
                      id: "users",
                      label: "Gestione Utenti",
                      count: users.length,
                      icon: <Shield className="w-3.5 h-3.5" />,
                    });
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
                          ? "bg-orange-400 hover:bg-orange-500 text-white border-orange-600 shadow-md scale-105 active:translate-y-0.5"
                          : "bg-white hover:bg-amber-100 text-sky-900 border-sky-300 hover:border-sky-400 shadow-sm"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`text-[9px] md:text-[10px] px-1 py-0.1 rounded-md font-black ${isActive ? "bg-orange-700 text-white" : "bg-sky-100 text-sky-850"}`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Sandbox Workspace Frame */}
      <main className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8 flex-1 w-full font-sans">
        {isTeamUser && !isTeamAuthorized ? (
          <div
            id="team-unauthorized-card"
            className="bg-white rounded-3xl p-8 md:p-12 border-4 border-rose-400 text-center max-w-xl mx-auto shadow-xl mt-12 animate-in zoom-in-95 duration-200"
          >
            <Lock className="w-16 h-16 text-rose-500 mx-auto animate-pulse mb-6" />
            <h3 className="text-xl md:text-2xl font-black text-rose-950 uppercase tracking-tight">
              Torneo richiesto non attivo ⚠️
            </h3>
            <p className="text-sm text-slate-500 mt-4 leading-relaxed font-bold">
              L'account della squadra{" "}
              <span className="text-sky-600 font-mono">
                "{currentUser?.username}"
              </span>{" "}
              è autorizzato ad accedere esclusivamente ai tornei in cui risulta
              regolarmente iscritta.
            </p>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mt-6 text-xs text-rose-800 leading-relaxed font-semibold">
              Al momento, il torneo attivo caricato nel sistema non include la
              tua squadra, oppure non vi è alcun torneo attivo configurato. Si
              prega di attendere che l'organizzatore carichi il relativo torneo.
            </div>
            <div className="mt-8">
              <button
                id="btn-unauth-logout"
                onClick={() => {
                  handleLogout();
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-wider py-3.5 px-6 rounded-xl shadow-md transition-all border-b-4 border-slate-950 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Torna al Login / Cambia Account 🔄
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "teams" && (
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
                  isTournamentStarted={matches.some(
                    (m) =>
                      m.status === "completed" ||
                      m.status === "live" ||
                      m.sets.length > 0,
                  )}
                  onSubstituteTeam={handleSubstituteTeam}
                  currentUser={currentUser}
                  users={users}
                />
              </motion.div>
            )}

            {activeTab === "bracket" && (
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
                  loadedSaveName={loadedSaveName}
                />
              </motion.div>
            )}

            {activeTab === "standings" && (
              <motion.div
                key="standings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
              >
                <StandingsTab
                  teams={teams}
                  matches={matches}
                  activeTournamentConfig={activeTournamentConfig}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {activeTab === "notifications" && (
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

            {activeTab === "archive" && currentUser?.role === "admin" && (
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
                  saves={saves}
                  activeTeams={teams}
                  activeMatches={matches}
                  activeTournamentConfig={activeTournamentConfig}
                  loadedSaveName={loadedSaveName}
                  onClearActiveTournament={handleClearAllTournamentData}
                  onSaveActiveTournament={handleSaveActiveTournament}
                  onRestoreTournament={handleRestoreTournament}
                  onDeleteSave={handleDeleteSave}
                />
              </motion.div>
            )}

            {activeTab === "users" && currentUser?.role === "admin" && (
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
        )}
      </main>

      {/* Powered by Contrera */}
      <div
        id="app-powered-by-contrera"
        className="flex flex-col items-center justify-center gap-1.5 mt-10 -mb-6 select-none animate-in fade-in duration-300"
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          powered by
        </span>
        <div className="flex items-center justify-center">
          <a
            href="https://www.contrerasmartphone.it"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            <img
              id="contrera-powered-logo"
              src={contreraLogoUrl}
              alt="Contrera Logo"
              className="w-[100px] h-[100px] object-contain"
              referrerPolicy="no-referrer"
            />
          </a>
        </div>
      </div>

      {/* Bottom Ticker */}
      <footer className="mt-12 bg-emerald-500 h-14 flex items-center overflow-hidden whitespace-nowrap shadow-inner border-t-4 border-emerald-600">
        <div className="bg-emerald-700 h-full flex flex-col justify-center items-center font-black text-white italic tracking-wider text-[10px] md:text-xs shrink-0 font-sans text-center leading-none border-r border-emerald-600 w-20 md:w-24 px-1">
          <div>PROSSIMI</div>
          <div className="text-emerald-200 mt-0.5">MATCH</div>
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center">
          <div className="animate-marquee flex items-center">
            {/* First sequence of matches */}
            <div className="flex items-center space-x-12 px-6 text-emerald-50 font-black text-xs uppercase tracking-wider font-sans shrink-0">
              {(() => {
                const garaMap = getGaraNumbersMap(matches);
                const realScheduledMatches = matches.filter(
                  (m) =>
                    m.status === "scheduled" &&
                    m.team1 &&
                    m.team2 &&
                    m.team1.id !== "t-bye" &&
                    m.team2.id !== "t-bye" &&
                    !m.team1.name.toLowerCase().includes("bye") &&
                    !m.team2.name.toLowerCase().includes("bye") &&
                    !m.team1.name.toLowerCase().includes("riposo") &&
                    !m.team2.name.toLowerCase().includes("riposo"),
                );
                const sortedScheduled = [...realScheduledMatches].sort(
                  (a, b) => {
                    const tA = a.time || "99:99";
                    const tB = b.time || "99:99";
                    if (tA !== tB) return tA.localeCompare(tB);
                    return (a.position || 0) - (b.position || 0);
                  },
                );
                const earliestTime =
                  sortedScheduled.length > 0 ? sortedScheduled[0].time : "";
                const nextMatches = earliestTime
                  ? sortedScheduled.filter((m) => m.time === earliestTime)
                  : [];

                return nextMatches.length > 0 ? (
                  nextMatches.map((m, idx) => (
                    <span
                      key={`grp1-${m.id || idx}`}
                      className="flex items-center gap-1.5 shrink-0 select-none"
                    >
                      ⏱️ {m.time} - GARA {garaMap[m.id] || "?"}: {m.team1?.name}{" "}
                      VS {m.team2?.name} {m.court && `(${m.court})`}
                    </span>
                  ))
                ) : (
                  <span className="shrink-0 select-none">
                    Nessun match programmato con squadre reali al momento.
                    Genera il tabellone per iniziare la competizione! ☀️
                  </span>
                );
              })()}
            </div>
            {/* Second identical sequence of matches for seamless infinity loop */}
            <div
              className="flex items-center space-x-12 px-6 text-emerald-50 font-black text-xs uppercase tracking-wider font-sans shrink-0"
              aria-hidden="true"
            >
              {(() => {
                const garaMap = getGaraNumbersMap(matches);
                const realScheduledMatches = matches.filter(
                  (m) =>
                    m.status === "scheduled" &&
                    m.team1 &&
                    m.team2 &&
                    m.team1.id !== "t-bye" &&
                    m.team2.id !== "t-bye" &&
                    !m.team1.name.toLowerCase().includes("bye") &&
                    !m.team2.name.toLowerCase().includes("bye") &&
                    !m.team1.name.toLowerCase().includes("riposo") &&
                    !m.team2.name.toLowerCase().includes("riposo"),
                );
                const sortedScheduled = [...realScheduledMatches].sort(
                  (a, b) => {
                    const tA = a.time || "99:99";
                    const tB = b.time || "99:99";
                    if (tA !== tB) return tA.localeCompare(tB);
                    return (a.position || 0) - (b.position || 0);
                  },
                );
                const earliestTime =
                  sortedScheduled.length > 0 ? sortedScheduled[0].time : "";
                const nextMatches = earliestTime
                  ? sortedScheduled.filter((m) => m.time === earliestTime)
                  : [];

                return nextMatches.length > 0 ? (
                  nextMatches.map((m, idx) => (
                    <span
                      key={`grp2-${m.id || idx}`}
                      className="flex items-center gap-1.5 shrink-0 select-none"
                    >
                      ⏱️ {m.time} - GARA {garaMap[m.id] || "?"}: {m.team1?.name}{" "}
                      VS {m.team2?.name} {m.court && `(${m.court})`}
                    </span>
                  ))
                ) : (
                  <span className="shrink-0 select-none">
                    Nessun match programmato con squadre reali al momento.
                    Genera il tabellone per iniziare la competizione! ☀️
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="hidden md:flex bg-emerald-900 text-emerald-300 text-[10px] uppercase tracking-widest font-black px-4 h-full items-center shrink-0">
          BEACH HUB 2026
        </div>
      </footer>
    </div>
  );
}
