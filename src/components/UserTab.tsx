import React, { useState, useEffect } from "react";
import { AppUser, RegistrationRequest } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import {
  Shield,
  UserPlus,
  Trash2,
  Edit3,
  Key,
  Plus,
  Lock,
  Check,
  Eye,
  EyeOff,
  X,
  Copy,
  Trophy,
} from "lucide-react";

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

interface UserTabProps {
  currentUser: AppUser | null;
  users: AppUser[];
}

export default function UserTab({ currentUser, users }: UserTabProps) {
  const isAdmin = currentUser && currentUser.role === "admin";

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDeleteState, setUserToDeleteState] = useState<AppUser | null>(
    null,
  );

  // New user credentials state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<
    "admin" | "collaborator" | "reader" | "ATLETA"
  >("reader");
  const [newNome, setNewNome] = useState("");
  const [newCognome, setNewCognome] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newGenere, setNewGenere] = useState<"M" | "F" | "">("");
  const [newDataNascita, setNewDataNascita] = useState("");
  const [newIsAthlete, setNewIsAthlete] = useState(false);

  // Approval modal state
  const [requestToApprove, setRequestToApprove] = useState<RegistrationRequest | null>(null);
  const [approveNome, setApproveNome] = useState("");
  const [approveCognome, setApproveCognome] = useState("");
  const [approveUsername, setApproveUsername] = useState("");
  const [approvePassword, setApprovePassword] = useState("");
  const [approveTelefono, setApproveTelefono] = useState("");
  const [approveGenere, setApproveGenere] = useState<"M" | "F" | "">("");
  const [approveDataNascita, setApproveDataNascita] = useState("");
  const [approveRole, setApproveRole] = useState<"admin" | "collaborator" | "reader" | "ATLETA">("reader");
  const [approveIsAthlete, setApproveIsAthlete] = useState(false);

  // Registration requests state
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      collection(db, "registrationRequests"),
      (snapshot) => {
        const list: RegistrationRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as RegistrationRequest);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setRequests(list);
      },
      (error) => {
        console.error("Errore sincronizzazione richieste registrazione:", error);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  // Visibility toggles
  const [passwordsShown, setPasswordsShown] = useState<{
    [key: string]: boolean;
  }>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div
        id="users-tab-forbidden"
        className="bg-white rounded-3xl p-8 border border-red-200/50 text-center max-w-lg mx-auto shadow-sm mt-6"
      >
        <Lock className="w-12 h-12 text-red-500 mx-auto animate-bounce mb-4" />
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
          Accesso Riservato agli Amministratori
        </h3>
        <p className="text-xs text-slate-550 mt-2.5 leading-relaxed">
          Spiacenti, solo gli amministratori del Beach Volley Hub possono
          accedere a questo pannello di gestione dei privilegi utente e delle
          password. Effettua l'accesso come "admin" per sbloccare questa
          funzionalità.
        </p>
      </div>
    );
  }

  const adminUsers = users.filter((u) => u.isTeamUser !== true);
  const pendingRequests = requests.filter((r) => r.status === "pending" || !r.status);

  const togglePasswordVisibility = (id: string) => {
    setPasswordsShown((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const cleanTelefono = newTelefono.trim();

    if (!cleanUsername || !cleanPassword || !cleanTelefono) {
      setErrorText("I campi username, password e numero di telefono sono obbligatori.");
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorText("Il nome utente deve avere almeno 3 caratteri.");
      return;
    }

    // Check if phone number already exists
    const normNewPhone = normalizePhoneForComparison(cleanTelefono);
    if (users.some((u) => u.telefono && normalizePhoneForComparison(u.telefono) === normNewPhone)) {
      setErrorText(`Il numero di telefono "${cleanTelefono}" è già registrato.`);
      return;
    }

    // Check if username already exists
    if (users.some((u) => u.username === cleanUsername)) {
      setErrorText(`L'utente "${cleanUsername}" è già presente nel database.`);
      return;
    }

    const newUser: AppUser = {
      id: cleanUsername, // unique identifier based on username
      username: cleanUsername,
      password: cleanPassword,
      role: newRole,
      createdAt: new Date().toLocaleDateString("it-IT"),
      nome: newNome.trim(),
      cognome: newCognome.trim(),
      telefono: cleanTelefono,
      isAthlete: (newRole === "admin" || newRole === "collaborator") ? newIsAthlete : (newRole === "ATLETA" ? true : false),
    };

    if (newGenere) {
      newUser.genere = newGenere;
    }
    if (newDataNascita) {
      newUser.dataNascita = newDataNascita;
    }

    try {
      await setDoc(doc(db, "users", newUser.id), newUser);
      setSuccessText(`Profilo "${cleanUsername}" creato con successo! 🎉`);
      setIsAddFormOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("reader");
      setNewNome("");
      setNewCognome("");
      setNewTelefono("");
      setNewGenere("");
      setNewDataNascita("");
      setNewIsAthlete(false);
      setTimeout(() => setSuccessText(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorText(null);
    setSuccessText(null);

    const cleanTelefono = editingUser.telefono?.trim();

    if (!cleanTelefono) {
      setErrorText("Il numero di telefono è obbligatorio.");
      return;
    }

    // Check if phone number already exists for another user
    if (users.some((u) => u.telefono === cleanTelefono && u.id !== editingUser.id)) {
      setErrorText(`Il numero di telefono "${cleanTelefono}" è già registrato.`);
      return;
    }

    try {
      const updatedUser = { ...editingUser, telefono: cleanTelefono };
      if (updatedUser.role === "ATLETA") {
        updatedUser.isAthlete = true;
      } else if (updatedUser.role !== "admin" && updatedUser.role !== "collaborator") {
        updatedUser.isAthlete = false;
      }

      await setDoc(doc(db, "users", editingUser.id), updatedUser);

      setSuccessText(
        `Privilegi per "${editingUser.username}" aggiornati con successo! ⚙️`,
      );
      setEditingUser(null);
      setTimeout(() => setSuccessText(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${editingUser.id}`);
    }
  };

  const handleDeleteUser = (userToDelete: AppUser) => {
    if (currentUser && userToDelete.username === currentUser.username) {
      setErrorText(
        "Non puoi rimuovere la tua stessa utenza amministratore attiva!",
      );
      setTimeout(() => setErrorText(null), 4500);
      return;
    }

    setUserToDeleteState(userToDelete);
  };

  const confirmDeleteUser = async () => {
    if (!userToDeleteState) return;
    try {
      await deleteDoc(doc(db, "users", userToDeleteState.id));
      setSuccessText(`Accesso rimosso per "${userToDeleteState.username}".`);
      setTimeout(() => setSuccessText(null), 4000);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${userToDeleteState.id}`,
      );
    } finally {
      setUserToDeleteState(null);
    }
  };

  const openApproveModal = (req: RegistrationRequest) => {
    setRequestToApprove(req);
    setApproveNome(req.nome || "");
    setApproveCognome(req.cognome || "");
    setApproveUsername(req.username || "");
    setApprovePassword(req.password || "");
    setApproveTelefono(req.telefono || "");
    setApproveGenere(req.genere || "");
    setApproveDataNascita(req.dataNascita || "");
    setApproveRole(req.role || "reader");
    setApproveIsAthlete(req.isAthlete || false);
  };

  const confirmApproveRequest = async () => {
    if (!requestToApprove) return;
    setErrorText(null);
    setSuccessText(null);

    const cleanUsername = approveUsername.trim().toLowerCase().replace(/\s+/g, "");
    const cleanNome = approveNome.trim();
    const cleanCognome = approveCognome.trim();
    const cleanTelefono = approveTelefono.trim();
    const cleanPassword = approvePassword.trim();

    // --- DATABASE RULES VALIDATION ---
    // 1. Check required fields
    if (!cleanUsername || !cleanNome || !cleanCognome || !cleanTelefono || !cleanPassword) {
      setErrorText("Compila tutti i campi obbligatori (Nome, Cognome, Username, Password, Telefono).");
      return;
    }

    // 2. Validate lengths matching firestore.rules
    if (cleanUsername.length < 3 || cleanUsername.length > 100) {
      setErrorText("La lunghezza dell'username deve essere compresa tra 3 e 100 caratteri.");
      return;
    }
    if (cleanPassword.length < 4 || cleanPassword.length > 100) {
      setErrorText("La lunghezza della password deve essere compresa tra 4 e 100 caratteri.");
      return;
    }
    if (cleanNome.length < 2 || cleanNome.length > 100) {
      setErrorText("La lunghezza del nome deve essere compresa tra 2 e 100 caratteri.");
      return;
    }
    if (cleanCognome.length < 2 || cleanCognome.length > 100) {
      setErrorText("La lunghezza del cognome deve essere compresa tra 2 e 100 caratteri.");
      return;
    }
    if (cleanTelefono.length < 5 || cleanTelefono.length > 50) {
      setErrorText("La lunghezza del numero di telefono deve essere compresa tra 5 e 50 caratteri.");
      return;
    }

    // 3. Validate Genre
    if (approveGenere && approveGenere !== "M" && approveGenere !== "F") {
      setErrorText("Il genere selezionato non è valido. Scegli tra Maschio (M) o Femmina (F).");
      return;
    }

    // 4. Validate Role
    const validRoles = ["admin", "collaborator", "reader", "ATLETA"];
    if (!validRoles.includes(approveRole)) {
      setErrorText("Il ruolo selezionato non è valido.");
      return;
    }

    // Check if username already exists in users
    if (users.some((u) => u.username === cleanUsername || u.id === cleanUsername)) {
      setErrorText(`L'utente con username "${cleanUsername}" è già presente nel database.`);
      return;
    }

    // Check if phone number already exists in users (using robust normalized check)
    const normApprovePhone = normalizePhoneForComparison(cleanTelefono);
    const phoneExists = users.some((u) => {
      if (!u.telefono) return false;
      return normalizePhoneForComparison(u.telefono) === normApprovePhone;
    });

    if (phoneExists) {
      setErrorText(`Il numero di telefono "${cleanTelefono}" è già associato a un altro utente.`);
      return;
    }

    try {
      const newUser: AppUser = {
        id: cleanUsername,
        username: cleanUsername,
        password: cleanPassword,
        role: approveRole,
        createdAt: new Date().toLocaleDateString("it-IT"),
        nome: cleanNome,
        cognome: cleanCognome,
        telefono: cleanTelefono,
        isAthlete: (approveRole === "admin" || approveRole === "collaborator") ? approveIsAthlete : (approveRole === "ATLETA" ? true : false),
      };

      if (approveGenere) {
        newUser.genere = approveGenere as "M" | "F";
      }
      if (approveDataNascita) {
        newUser.dataNascita = approveDataNascita;
      }

      // 1. Create the user
      await setDoc(doc(db, "users", newUser.id), newUser);

      // 2. Delete the registration request
      await deleteDoc(doc(db, "registrationRequests", requestToApprove.id));

      setSuccessText(`Richiesta approvata con successo! L'utente "${cleanUsername}" è ora attivo. 🎉`);
      setTimeout(() => setSuccessText(null), 6000);
      
      // Open WhatsApp to notify user with full summary of their details
      const roleMap: Record<string, string> = {
        admin: "Amministratore",
        collaborator: "Operatore / Collaboratore",
        reader: "Lettore / Ospite",
        ATLETA: "Atleta"
      };

      const summaryMsg = `Ciao ${cleanNome}, il tuo account per Beach Volley Hub è stato approvato! 🎉

Ecco il riepilogo dei tuoi dati di accesso e profilo:
👤 Nome: ${cleanNome} ${cleanCognome}
📧 Username: ${cleanUsername}
🔑 Password: ${cleanPassword}
📞 Telefono: ${cleanTelefono}
🎭 Ruolo: ${roleMap[approveRole] || approveRole}
${approveGenere ? `🧬 Genere: ${approveGenere === 'M' ? 'Maschio' : 'Femmina'}\n` : ''}${approveDataNascita ? `📅 Data di Nascita: ${approveDataNascita}\n` : ''}
Puoi accedere ora all'applicazione! Benvenuto/a a bordo! 🏖️`;

      // Optimize telephone number with +39 prefix if not already present
      let waPhone = cleanTelefono.replace(/\D/g, ""); // strip non-digits
      if (waPhone.startsWith("0039")) {
        waPhone = waPhone.substring(4);
      } else if (waPhone.startsWith("39") && waPhone.length > 10) {
        // already starts with 39 and has enough digits
      } else if (waPhone.startsWith("3") && (waPhone.length === 9 || waPhone.length === 10)) {
        // Typical Italian mobile number
        waPhone = "39" + waPhone;
      } else if (!waPhone.startsWith("39")) {
        // Fallback prefix with 39
        waPhone = "39" + waPhone;
      }

      const message = encodeURIComponent(summaryMsg);
      // Use official send endpoint to guarantee special characters and emoji parsing across desktop and mobile devices
      window.open(`https://api.whatsapp.com/send?phone=${waPhone}&text=${message}`, "_blank");

      // Close modal
      setRequestToApprove(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `approve/${requestToApprove.id}`);
      setRequestToApprove(null);
    }
  };

  const handleRejectRequest = async (req: RegistrationRequest) => {
    setErrorText(null);
    setSuccessText(null);

    try {
      await deleteDoc(doc(db, "registrationRequests", req.id));
      setSuccessText(`Richiesta di registrazione per "${req.username}" rifiutata e rimossa. ❌`);
      setTimeout(() => setSuccessText(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reject/${req.id}`);
    }
  };

  return (
    <div id="users-dashboard-pane" className="space-y-6">
      {/* Feedbacks Alerts banner */}
      {successText && (
        <div
          id="users-success-bar"
          className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-2"
        >
          <Check className="w-5 h-5 text-emerald-600" />
          {successText}
        </div>
      )}

      {errorText && (
        <div
          id="users-error-bar"
          className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-xl shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-2"
        >
          <Lock className="w-5 h-5 text-red-600" />
          {errorText}
        </div>
      )}

      {/* Registration Requests Box */}
      {pendingRequests.length > 0 && (
        <div
          id="registration-requests-card"
          className="bg-sky-50 rounded-3xl border-2 border-sky-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-sky-200 pb-4 mb-4">
            <span className="text-xl">📥</span>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Richieste di Registrazione in Attesa ({pendingRequests.length})
              </h3>
              <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider mt-0.5">
                Approva le richieste per abilitare gli operatori o atleti all'accesso
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-sky-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-xs uppercase">
                      👤 {req.nome} {req.cognome}
                    </span>
                    <span className="text-[9px] bg-sky-100 text-sky-800 font-black uppercase px-2 py-0.5 rounded-full border border-sky-200">
                      Ruolo: {req.role}
                    </span>
                    {req.genere && (
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-black uppercase px-2 py-0.5 rounded-full border border-slate-200">
                        {req.genere === "M" ? "Maschio (M)" : "Femmina (F)"}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex flex-wrap gap-x-4 gap-y-1">
                    <span>Username: <strong className="font-mono text-slate-700">{req.username}</strong></span>
                    <span>Telefono: <strong className="font-mono text-slate-700">📞 {req.telefono}</strong></span>
                    {req.dataNascita && (
                      <span>Data Nascita: <strong className="font-mono text-slate-700">📅 {req.dataNascita}</strong></span>
                    )}
                    <span>Richiesto il: <strong className="font-mono text-slate-700">{req.createdAt}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    id={`btn-reject-req-${req.id}`}
                    onClick={() => handleRejectRequest(req)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rifiuta
                  </button>
                  <button
                    id={`btn-approve-req-${req.id}`}
                    onClick={() => openApproveModal(req)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-b-2 border-emerald-700 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    Verifica e Approva
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Container list */}
      <div
        id="users-workspace-card"
        className="bg-white rounded-3xl border border-amber-200/60 p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-500" />
              Gestione Privilegi Utente Operatori ({adminUsers.length})
            </h2>
            <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider mt-1">
              Consolle per la regolazione e l'impostazione degli accessi al
              software
            </p>
          </div>

          <button
            id="btn-open-create-user-form"
            onClick={() => {
              setIsAddFormOpen(true);
              setEditingUser(null);
            }}
            className="bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-2.5 px-4 rounded-xl shadow-md border-b-2 border-sky-700 select-none flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Aggiungi Utente ➕
          </button>
        </div>

        {/* User list table representation */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-slate-50/20">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">
                  Operatore
                </th>
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">
                  Anagrafica / Telefono
                </th>
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">
                  Livello Privilegio
                </th>
                <th className="p-3.5 text-left font-black text-slate-500 uppercase tracking-wider">
                  Chiave Password
                </th>
                <th className="p-3.5 text-center font-black text-slate-500 uppercase tracking-wider">
                  Stato Sessione
                </th>
                <th className="p-3.5 text-right font-black text-slate-500 uppercase tracking-wider">
                  Azioni Gestionali
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {adminUsers.map((u) => {
                const isSelf = u.username === currentUser?.username;
                const isOnline =
                  !!u.activeSessionId &&
                  u.lastActiveAt &&
                  Date.now() - u.lastActiveAt < 120000; // Online if active in last 2 minutes and has active session
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-850 flex items-center gap-1.5">
                        <span className="font-mono">{u.username}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-sky-100 text-sky-850 font-black uppercase px-2 py-0.5 rounded-full border border-sky-200">
                            TU UTENTE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Creato il:{" "}
                        <span className="font-semibold">{u.createdAt}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5 text-slate-700">
                        {u.nome || u.cognome ? (
                          <div className="font-black text-xs uppercase flex items-center gap-1">
                            {u.genere === 'M' ? '👨' : u.genere === 'F' ? '👩' : '👤'} {u.nome || ""} {u.cognome || ""}
                          </div>
                        ) : (
                          <div className="text-slate-450 italic flex items-center gap-1">
                            {u.genere === 'M' ? '👨' : u.genere === 'F' ? '👩' : '👤'} - Nessun nome -
                          </div>
                        )}
                        {u.telefono ? (
                          <div className="text-[10px] font-mono text-slate-500 font-bold">
                            📞 {u.telefono}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-450 italic">
                            Senza recapito
                          </div>
                        )}
                        {u.dataNascita && (
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                            📅 Nascita: {u.dataNascita}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-full border ${
                            u.role === "admin"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : u.role === "collaborator"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : u.role === "ATLETA"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          🛡️{" "}
                          {u.role === "admin"
                            ? "Amministratore (Admin)"
                            : u.role === "collaborator"
                              ? "Collaboratore Score"
                              : u.role === "ATLETA"
                                ? "Atleta"
                                : "Lettore Spettatore"}
                        </span>
                        {u.isAthlete && u.role !== "ATLETA" && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-250 py-1 px-2.5 rounded-full uppercase tracking-wider">
                            🏃 Atleta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type={passwordsShown[u.id] ? "text" : "password"}
                          value={u.password || ""}
                          readOnly
                          className="bg-transparent text-[11px] font-mono outline-none border-none py-0.5 max-w-[100px]"
                        />
                        <button
                          id={`btn-toggle-pass-vis-${u.id}`}
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all"
                          title="Mostra / Nascondi password"
                        >
                          {passwordsShown[u.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-2550 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-emerald-505 bg-emerald-500 rounded-full animate-pulse"></span>
                          Attivo Connesso
                        </span>
                      ) : u.lastActiveAt ? (
                        <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                          <div>Sconnesso</div>
                          <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                            {new Date(u.lastActiveAt).toLocaleString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Mai Connesso
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => {
                            setEditingUser({ ...u });
                            setIsAddFormOpen(false);
                          }}
                          className="bg-slate-50 hover:bg-sky-50 text-sky-700 p-2 rounded-lg transition-all border border-slate-200"
                          title="Modifica privilegi / Password"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u)}
                          disabled={isSelf}
                          className={`p-2 rounded-lg transition-all border ${
                            isSelf
                              ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
                              : "bg-slate-50 hover:bg-red-50 text-red-650 border-slate-200 hover:border-red-200"
                          }`}
                          title="Elimina accesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide / Modal: Add User Form */}
      {isAddFormOpen && (
        <div
          id="add-user-modal-overlay"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div
            id="add-user-modal"
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400"
          >
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-orange-550" />
                Aggiungi Nuovo Profilo Accesso
              </h3>
              <button
                id="btn-close-add-user-modal"
                onClick={() => setIsAddFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Mario"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={newCognome}
                    onChange={(e) => setNewCognome(e.target.value)}
                    placeholder="Rossi"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Numero di Telefono
                  </label>
                  <input
                    type="tel"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    placeholder="345 6789012"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 placeholder-slate-405 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Genere
                  </label>
                  <select
                    value={newGenere}
                    onChange={(e) => setNewGenere(e.target.value as "M" | "F" | "")}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                  >
                    <option value="">- Seleziona -</option>
                    <option value="M">Maschio (M)</option>
                    <option value="F">Femmina (F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={newDataNascita}
                  onChange={(e) => setNewDataNascita(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="E.g., mario_rossi"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black uppercase text-slate-800 placeholder-slate-404 focus:outline-none focus:border-sky-500 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Password di Accesso
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digita password sicura"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black tracking-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Generate simple random password
                      const chars =
                        "abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789";
                      let randPass = "";
                      for (let i = 0; i < 8; i++) {
                        randPass += chars.charAt(
                          Math.floor(Math.random() * chars.length),
                        );
                      }
                      setNewPassword(randPass);
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[9px] font-black uppercase bg-sky-100 text-sky-850 hover:bg-sky-200 rounded-lg transition-all"
                  >
                    Genera password 🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Tipo di Privilegio
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all uppercase"
                >
                  <option value="reader">
                    Lettore Spettatore (Solo lettura)
                  </option>
                  <option value="collaborator">
                    Collaboratore Score (Aggiorna punteggi e tabelloni)
                  </option>
                  <option value="admin">
                    Amministratore Completo (Accesso a tutto)
                  </option>
                  <option value="ATLETA">Atleta (Accesso Limitato)</option>
                </select>

                {(newRole === "admin" || newRole === "collaborator") && (
                  <div className="mt-4 flex items-center gap-2.5 bg-sky-50 border border-sky-100 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="new-user-is-athlete-checkbox"
                      checked={newIsAthlete}
                      onChange={(e) => setNewIsAthlete(e.target.checked)}
                      className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded cursor-pointer"
                    />
                    <label htmlFor="new-user-is-athlete-checkbox" className="text-xs font-bold text-sky-850 select-none cursor-pointer">
                      Abilita anche come Atleta 🏃 (Può iscriversi ai tornei)
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-00 border-sky-700"
                >
                  Conferma Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide / Modal: EDIT User Form */}
      {editingUser && (
        <div
          id="editing-user-modal-overlay"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div
            id="editing-user-modal"
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-sky-400"
          >
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight flex items-center gap-1.5">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                Modifica Privilegi
              </h3>
              <button
                id="btn-close-edit-user-modal"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Nome Utente
                </label>
                <div className="bg-slate-100 border border-slate-200 text-slate-500 px-4 py-3 rounded-xl font-mono text-xs font-black uppercase">
                  {editingUser.username}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editingUser.nome || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, nome: e.target.value })
                    }
                    placeholder="Nome"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={editingUser.cognome || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        cognome: e.target.value,
                      })
                    }
                    placeholder="Cognome"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={editingUser.telefono || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, telefono: e.target.value })
                    }
                    placeholder="Telefono"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Genere
                  </label>
                  <select
                    value={editingUser.genere || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, genere: e.target.value as "M" | "F" | undefined })
                    }
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                  >
                    <option value="">- Seleziona -</option>
                    <option value="M">Maschio (M)</option>
                    <option value="F">Femmina (F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={editingUser.dataNascita || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, dataNascita: e.target.value })
                  }
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="text"
                  value={editingUser.password || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  placeholder="Imposta nuova password"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black tracking-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Rapporto di Privilegi
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 transition-all uppercase"
                >
                  <option value="reader">
                    Lettore Spettatore (Solo lettura)
                  </option>
                  <option value="collaborator">
                    Collaboratore Score (Aggiorna punteggi e tabelloni)
                  </option>
                  <option value="admin">
                    Amministratore Completo (Accesso a tutto)
                  </option>
                  <option value="ATLETA">Atleta (Accesso Limitato)</option>
                </select>

                {(editingUser.role === "admin" || editingUser.role === "collaborator") && (
                  <div className="mt-4 flex items-center gap-2.5 bg-sky-50 border border-sky-100 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="edit-user-is-athlete-checkbox"
                      checked={!!editingUser.isAthlete}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          isAthlete: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded cursor-pointer"
                    />
                    <label htmlFor="edit-user-is-athlete-checkbox" className="text-xs font-bold text-sky-850 select-none cursor-pointer">
                      Abilita anche come Atleta 🏃 (Può iscriversi ai tornei)
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-sky-700"
                >
                  Salva Privilegi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide / Modal: APPROVE and EDIT Registration Request */}
      {requestToApprove && (
        <div
          id="approving-request-modal-overlay"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div
            id="approving-request-modal"
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-emerald-400 my-8"
          >
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-emerald-600" />
                Modifica e Approva Richiesta
              </h3>
              <button
                id="btn-close-approve-request-modal"
                onClick={() => setRequestToApprove(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={approveNome}
                    onChange={(e) => setApproveNome(e.target.value)}
                    placeholder="Nome"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={approveCognome}
                    onChange={(e) => setApproveCognome(e.target.value)}
                    placeholder="Cognome"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Nome Utente (Username) *
                </label>
                <input
                  type="text"
                  value={approveUsername}
                  onChange={(e) => setApproveUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Telefono *
                  </label>
                  <input
                    type="tel"
                    value={approveTelefono}
                    onChange={(e) => setApproveTelefono(e.target.value)}
                    placeholder="Telefono"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Genere
                  </label>
                  <select
                    value={approveGenere}
                    onChange={(e) => setApproveGenere(e.target.value as "M" | "F" | "")}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="">- Seleziona -</option>
                    <option value="M">Maschio (M)</option>
                    <option value="F">Femmina (F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={approveDataNascita}
                  onChange={(e) => setApproveDataNascita(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Password *
                </label>
                <input
                  type="text"
                  value={approvePassword}
                  onChange={(e) => setApprovePassword(e.target.value)}
                  placeholder="Password di accesso"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-black tracking-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Ruolo Assegnato *
                </label>
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all uppercase"
                >
                  <option value="reader">
                    Lettore Spettatore (Solo lettura)
                  </option>
                  <option value="collaborator">
                    Collaboratore Score (Aggiorna punteggi e tabelloni)
                  </option>
                  <option value="admin">
                    Amministratore Completo (Accesso a tutto)
                  </option>
                  <option value="ATLETA">Atleta (Accesso Limitato)</option>
                </select>

                {(approveRole === "admin" || approveRole === "collaborator") && (
                  <div className="mt-4 flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="approve-is-athlete-checkbox"
                      checked={approveIsAthlete}
                      onChange={(e) => setApproveIsAthlete(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                    />
                    <label htmlFor="approve-is-athlete-checkbox" className="text-xs font-bold text-emerald-800 select-none cursor-pointer">
                      Abilita anche come Atleta 🏃 (Può iscriversi ai tornei)
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRequestToApprove(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={confirmApproveRequest}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl shadow-md transition-all border-b-4 border-emerald-700"
                >
                  Approva e Invia WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {userToDeleteState !== null && (
        <div
          id="delete-user-confirm-modal"
          className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border-4 border-rose-450 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border-2 border-rose-300 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-xs mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-rose-750 uppercase italic text-lg leading-tight">
                Revocare Accesso?
              </h3>
              <p className="text-xs text-slate-550 font-semibold leading-relaxed">
                Sei sicuro di voler revocare l'accesso e cancellare l'utente{" "}
                <strong className="text-slate-850 font-black">
                  "{userToDeleteState.username}"
                </strong>
                ? Questa operazione eliminerà definitivamente le sue credenziali
                di operatore.
              </p>
            </div>
            <div className="flex gap-2 font-sans">
              <button
                id="delete-user-modal-cancel"
                type="button"
                onClick={() => setUserToDeleteState(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl border border-slate-350 transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                id="delete-user-modal-ok"
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Sì, Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
