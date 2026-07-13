import React, { useState, useEffect, useRef } from "react";
import { AppUser, SocialPost } from "../types";
import { db, cleanObject, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  MessageCircle,
  Camera,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  User,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SocialTabProps {
  currentUser: AppUser | null;
  posts: SocialPost[];
}

export default function SocialTab({ currentUser, posts }: SocialTabProps) {
  const [content, setContent] = useState(() => {
    return localStorage.getItem("social_post_draft") || "";
  });
  const [imageFile, setImageFile] = useState<string | null>(() => {
    return localStorage.getItem("social_post_image_draft") || null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // State for triggering countdown re-renders every minute
  const [, setTimeTick] = useState(0);

  // Lightbox for full screen image preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Auto update expiration countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Salva bozza del testo automaticamente in caso di ricaricamento pagina (es. per riapertura fotocamera)
  useEffect(() => {
    localStorage.setItem("social_post_draft", content);
  }, [content]);

  // Salva l'immagine draft in localStorage se cambia
  useEffect(() => {
    if (imageFile) {
      try {
        localStorage.setItem("social_post_image_draft", imageFile);
      } catch (e) {
        console.error("Errore salvataggio bozza immagine:", e);
      }
    } else {
      localStorage.removeItem("social_post_image_draft");
    }
  }, [imageFile]);

  // Automatic clean-up: Delete expired posts from Firestore to protect write/storage limits
  useEffect(() => {
    const cleanupExpiredPosts = async () => {
      // Only trigger cleanup if user is admin or collaborator to avoid redundant batch deletes
      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "collaborator")) {
        return;
      }
      
      try {
        const now = Date.now();
        const postsSnap = await getDocs(collection(db, "posts"));
        const deletePromises: Promise<void>[] = [];
        
        postsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.expiresAt && data.expiresAt < now) {
            deletePromises.push(deleteDoc(doc(db, "posts", docSnap.id)));
          }
        });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          console.log(`Pulizia automatica completata: ${deletePromises.length} post scaduti rimossi.`);
        }
      } catch (err) {
        console.error("Errore durante la pulizia automatica dei post scaduti:", err);
      }
    };

    cleanupExpiredPosts();
  }, [currentUser]);

  // Handle image select & conversion to Base64 (resizing slightly if possible)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Per favore, seleziona un file immagine valido.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("L'immagine selezionata è troppo grande. Il limite massimo consentito è 20MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      
      // Basic client side downscaling if image is huge
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Downscale to max 1000px width/height to protect firestore document limits (1MB doc size)
        const MAX_DIM = 1000;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75); // 75% quality JPEG
          setImageFile(compressedBase64);
        } else {
          setImageFile(base64String);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const trimmedContent = content.trim();
    if (!trimmedContent && !imageFile) {
      setErrorMsg("Scrivi un messaggio o aggiungi una foto prima di pubblicare.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const now = Date.now();
    const postId = `post-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours lifespan

    const newPost: SocialPost = {
      id: postId,
      userId: currentUser.id,
      userName: currentUser.nome && currentUser.cognome 
        ? `${currentUser.nome} ${currentUser.cognome}` 
        : currentUser.username || "Utente",
      userRole: currentUser.role,
      content: trimmedContent,
      imageUrl: imageFile || undefined,
      createdAt: now,
      expiresAt: expiresAt,
    };

    try {
      await setDoc(doc(db, "posts", postId), cleanObject(newPost));
      setContent("");
      localStorage.removeItem("social_post_draft");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      setSuccessMsg("Post pubblicato con successo! Durerà per 24 ore.");
      
      // Auto dismiss success msg
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${postId}`);
      setErrorMsg("Errore durante la pubblicazione del post. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo post?")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${id}`);
      alert("Impossibile eliminare il post. Riprova.");
    }
  };

  // Filter out expired posts client-side in real-time
  const now = Date.now();
  const activePosts = posts.filter((p) => p.expiresAt > now);

  const getRemainingTimeStr = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Scaduto";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Scade tra ${hours}h ${minutes}m`;
    }
    return `Scade tra ${minutes}m`;
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-500 text-white border-rose-600";
      case "collaborator":
        return "bg-amber-500 text-slate-900 border-amber-600";
      default:
        return "bg-sky-500 text-white border-sky-600";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":
        return "Admin 👑";
      case "collaborator":
        return "Staff 🤝";
      default:
        return "Atleta 🏐";
    }
  };

  return (
    <div id="social-tab-container" className="space-y-6">
      {/* Tab Banner */}
      <div className="bg-gradient-to-r from-sky-600 to-orange-500 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <MessageCircle className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] uppercase font-black tracking-widest py-1 px-3 rounded-full border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            Social Hub Temporaneo
          </div>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">
            Social Beach Arena
          </h2>
          <p className="text-xs md:text-sm text-sky-100 leading-relaxed font-bold">
            Condividi le foto, i momenti migliori o gli sfottò del torneo in tempo reale! 
            Tutti i post hanno una durata rigorosa di <strong className="text-amber-200">24 ore</strong> proprio come le storie Instagram, dopodiché svaniranno per sempre.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Post Publisher: Left Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/85 backdrop-blur-md rounded-3xl border border-slate-700/60 p-5 shadow-lg relative overflow-hidden">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-orange-400" />
              Crea un nuovo Post
            </h3>

            {currentUser ? (
              <form onSubmit={handlePublish} className="space-y-4">
                {/* Content Textarea */}
                <div className="space-y-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="A cosa stai pensando? Condividi un aggiornamento..."
                    maxLength={350}
                    rows={4}
                    className="w-full bg-slate-900/80 text-white text-xs md:text-sm font-semibold p-4 rounded-2xl border border-slate-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder-slate-500 transition-all resize-none shadow-inner"
                  />
                  <div className="flex justify-end text-[10px] text-slate-500 font-mono">
                    {content.length} / 350 caratteri
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Aggiungi una foto:
                  </span>
                  
                  {imageFile ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500 bg-slate-900 max-h-48 flex items-center justify-center group shadow-md">
                      <img
                        src={imageFile}
                        alt="Preview caricata"
                        className="max-h-48 object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                            if (cameraInputRef.current) cameraInputRef.current.value = "";
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-full p-2.5 shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Direct Smartphone Camera Option */}
                      <div
                        onClick={() => cameraInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-700/20 transition-all group flex flex-col items-center justify-center gap-1.5"
                      >
                        <Camera className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300">
                          Scatta Foto
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Usa Fotocamera</span>
                      </div>

                      {/* Browse Gallery Option */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-700/20 transition-all group flex flex-col items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300">
                          Apri Galleria
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Cerca nei File</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Hidden standard gallery file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Hidden native smartphone camera input */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Error/Success Banners */}
                {errorMsg && (
                  <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-3 flex items-center gap-2 text-rose-300 text-xs font-semibold animate-shake">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-3 flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-fade-in">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit / Cancel buttons */}
                <div className="flex gap-2">
                  {(content.length > 0 || imageFile !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setContent("");
                        setImageFile(null);
                        setErrorMsg(null);
                        localStorage.removeItem("social_post_draft");
                        localStorage.removeItem("social_post_image_draft");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        if (cameraInputRef.current) cameraInputRef.current.value = "";
                      }}
                      disabled={isSubmitting}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] md:text-xs font-black uppercase tracking-wider py-3 px-4 rounded-2xl border border-slate-600/50 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Annulla
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] md:text-xs font-black uppercase tracking-wider py-3 px-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5 cursor-pointer ${
                      content.length > 0 || imageFile !== null ? "flex-[2]" : "w-full"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Pubblicazione...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        Pubblica
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 px-4 border border-slate-700/50 rounded-2xl bg-slate-900/40 space-y-3">
                <User className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-400">Login Richiesto</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Devi aver effettuato l'accesso al tuo account atleti o admin per poter inserire post.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Posts Feed: Right Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-400" />
              Feed dei Post ({activePosts.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Auto-rimozione dopo 24h
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {activePosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-800/40 rounded-3xl p-10 text-center border border-slate-700/40 max-w-xl mx-auto space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-300">Nessun post attivo</h4>
                  <p className="text-[11px] text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                    Non c'è ancora nessun post nelle ultime 24 ore. Sii il primo a rompere il ghiaccio!
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {activePosts.map((post) => {
                  const isAuthor = currentUser && post.userId === currentUser.id;
                  const isAdminOrCollab =
                    currentUser &&
                    (currentUser.role === "admin" || currentUser.role === "collaborator");
                  const showDelete = isAuthor || isAdminOrCollab;

                  return (
                    <motion.div
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-slate-800/90 rounded-3xl border border-slate-700/60 shadow-md p-4 relative overflow-hidden group flex flex-col gap-3"
                    >
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-xs uppercase">
                            {post.userName.slice(0, 2)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{post.userName}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md border ${getRoleBadgeColor(post.userRole)}`}>
                                {getRoleLabel(post.userRole)}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {new Date(post.createdAt).toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} - {new Date(post.createdAt).toLocaleDateString("it-IT", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Story Countdown */}
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                          </span>
                          {getRemainingTimeStr(post.expiresAt)}
                        </div>
                      </div>

                      {/* Content Text */}
                      {post.content && (
                        <p className="text-xs md:text-sm font-semibold text-slate-200 leading-relaxed whitespace-pre-wrap px-1">
                          {post.content}
                        </p>
                      )}

                      {/* Post Image with premium rounded look */}
                      {post.imageUrl && (
                        <div 
                          onClick={() => setLightboxImage(post.imageUrl!)}
                          className="relative rounded-2xl overflow-hidden max-h-72 bg-slate-900/60 border border-slate-700 cursor-pointer shadow-md group/img"
                        >
                          <img
                            src={post.imageUrl}
                            alt="Post allegato"
                            className="w-full h-full object-cover max-h-72 transition-transform duration-300 group-hover/img:scale-[1.02]"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-100 group-hover/img:bg-black/30 transition-colors" />
                        </div>
                      )}

                      {/* Footer Actions (Delete if permitted) */}
                      {showDelete && (
                        <div className="flex justify-end pt-1 border-t border-slate-700/40">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Elimina Post
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 border border-slate-700 transition-transform hover:scale-105"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Post allegato ingrandito"
                className="max-w-full max-h-[85vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
