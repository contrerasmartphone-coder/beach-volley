import React, { useState } from 'react';
import { NotificationLog, Team } from '../types';
import { Bell, Send, Check, AlertCircle, Sparkles, Smartphone, Mail, CloudSun, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  notifications: NotificationLog[];
  teams: Team[];
  onAddNotification: (notification: NotificationLog) => void;
  onClearNotifications: () => void;
}

export default function NotificationCenter({
  notifications,
  teams,
  onAddNotification,
  onClearNotifications,
}: NotificationCenterProps) {
  const [pushTitle, setPushTitle] = useState('Modifica Orario Match ⏰');
  const [pushMessage, setPushMessage] = useState('Attenzione: la partita del girone è stata anticipata di 10 minuti per evitare ritardi.');
  const [pushType, setPushType] = useState<NotificationLog['type']>('schedule_change');
  const [successSent, setSuccessSent] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Request standard browser notifications
  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Questo browser non supporta l\'API Notification nativa.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        new window.Notification('Notifiche Abilitate! 🏐', {
          body: 'Riceverai aggiornamenti in tempo reale sui risultati e gli orari del torneo di beach volley direttamente sul tuo schermo.',
          icon: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=200',
        });
      }
    } catch (err) {
      console.warn('Errore durante la richiesta permessi notifiche:', err);
      setBrowserPermission('denied');
    }
  };

  // Trigger custom notification composition
  const handleSendCustomNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) return;

    const newNotification: NotificationLog = {
      id: `notif-manual-${Date.now()}`,
      title: pushTitle.trim(),
      message: pushMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: pushType,
    };

    onAddNotification(newNotification);

    // Try sending native operating system push if permission granted
    if (browserPermission === 'granted') {
      try {
        new window.Notification(pushTitle, {
          body: pushMessage,
        });
      } catch (err) {
        console.warn('Impossibile emettere notifica nativa:', err);
      }
    }

    // Reset Form & Show visual feedback
    setPushMessage('');
    setSuccessSent(true);
    setTimeout(() => {
      setSuccessSent(false);
    }, 3500);
  };

  // Preloaded template messages helper
  const loadTemplate = (title: string, msg: string, type: NotificationLog['type']) => {
    setPushTitle(title);
    setPushMessage(msg);
    setPushType(type);
  };

  return (
    <div id="notification-tab-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Control Console / Dispatcher Column */}
      <div id="dispatcher-console" className="lg:col-span-1 space-y-6">
        {/* Browser Permission Panel */}
        <div className="bg-white rounded-3xl border-4 border-sky-200 p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="p-2.5 bg-sky-50 border-2 border-sky-100 rounded-xl text-sky-600">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Notifiche di Sistema</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Invia alert sui dispositivi dei giocatori</p>
            </div>
          </div>

          {browserPermission === 'default' && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 text-center space-y-3">
              <p className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                Abilita le notifiche native del browser per ricevere alert sul desktop quando aggiorni il tabellone o finisce un set!
              </p>
              <button
                id="enable-native-notifications-btn"
                onClick={handleEnableBrowserNotifications}
                className="w-full bg-orange-400 hover:bg-orange-500 text-white font-black py-2.5 px-3 rounded-full text-xs transition-all border-b-4 border-orange-600 active:translate-y-0.5 shadow-md uppercase tracking-wider"
              >
                Abilita Notifiche Desktop
              </button>
            </div>
          )}

          {browserPermission === 'granted' && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 stroke-[3]" />
              <span>Notifiche browser <strong className="text-emerald-950 underline">Abilitate</strong>! Ok.</span>
            </div>
          )}

          {browserPermission === 'denied' && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Notifiche disattivate nel browser. Feed attivo.</span>
            </div>
          )}

          {browserPermission === 'unsupported' && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>In-app simulation mode attiva.</span>
            </div>
          )}
        </div>

        {/* Sender Dispatcher Form */}
        <div className="bg-white rounded-3xl border-4 border-orange-300 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-400"></div>
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide mb-4">Invia Notifica Push (Simulatore)</h4>

          <form onSubmit={handleSendCustomNotification} className="space-y-4">
            <div>
              <label htmlFor="push-title-input" className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Titolo Push *</label>
              <input
                id="push-title-input"
                type="text"
                required
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-semibold text-slate-850 text-xs focus:outline-none focus:border-orange-400"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="push-type-select" className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
              <select
                id="push-type-select"
                className="w-full px-3 py-2 border-2 border-slate-250 rounded-xl font-bold text-slate-850 text-xs bg-white focus:outline-none focus:border-orange-400"
                value={pushType}
                onChange={(e) => setPushType(e.target.value as NotificationLog['type'])}
              >
                <option value="schedule_change">Cambio Orari / Campo ⏰</option>
                <option value="live_update">Notizia Live 🎙️</option>
                <option value="result">Aggiornamento Risultato 🏆</option>
                <option value="system">Annuncio Organizzativo 🏝️</option>
              </select>
            </div>

            <div>
              <label htmlFor="push-message-input" className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Testo del Messaggio *</label>
              <textarea
                id="push-message-input"
                required
                rows={3}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-medium text-slate-850 text-xs focus:outline-none focus:border-orange-400"
                placeholder="es. Si pregano tutti i capitani delle squadre..."
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
              />
            </div>

            {successSent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                id="push-sent-toast"
                className="p-3 bg-emerald-50 border-2 border-emerald-250 rounded-2xl text-emerald-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                Inviato a {teams.length} smartphone via MMS!
              </motion.div>
            )}

            <button
              id="dispatch-push-btn"
              type="submit"
              className="w-full bg-orange-400 hover:bg-orange-500 font-extrabold py-3 px-4 rounded-full text-xs text-white flex items-center justify-center gap-2 border-b-4 border-orange-600 active:translate-y-0.5 shadow-md uppercase tracking-wider"
            >
              <Send className="w-3.5 h-3.5 fill-white" />
              Invia Notifica Adesso
            </button>
          </form>

          {/* Quick template triggers */}
          <div className="mt-6 border-t-2 border-slate-100 pt-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Modelli Rapidi Selezionabili</h5>
            <div id="notif-templates-grid" className="space-y-2">
              <button
                id="template-meteo"
                onClick={() => loadTemplate('Condizioni Meteo 🌦️', 'Forte sole sulla riviera: raccomandiamo di bagnarsi la testa e idratarsi con i sali minerali al bar del lido.', 'system')}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 text-[10px] text-slate-600 flex items-center gap-2 transition-all font-bold uppercase tracking-wider"
              >
                <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Meteo ed idratazione</span>
              </button>
              <button
                id="template-court"
                onClick={() => loadTemplate('Spostamento Campo 🏟️', 'Il prossimo incontro si disputerà sul Campo Central 1 anziché sul Campo 2.', 'schedule_change')}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 text-[10px] text-slate-600 flex items-center gap-2 transition-all font-bold uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Variazione del Campo</span>
              </button>
              <button
                id="template-award"
                onClick={() => loadTemplate('Premiazioni Finali 🏆', 'Tutte le coppie partecipanti sono invitate alle ore 18:30 nell\'area beach per la consegna dei gadget e la coppa d\'oro.', 'system')}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 text-[10px] text-slate-600 flex items-center gap-2 transition-all font-bold uppercase tracking-wider"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Cerimonia di Premiazione</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker Logs Feed Column */}
      <div id="notifications-logs" className="lg:col-span-2 bg-white rounded-3xl shadow-xl border-4 border-sky-200 p-6 flex flex-col h-[650px]">
        <div className="flex justify-between items-center pb-4 border-b-2 border-slate-100 mb-4">
          <div>
            <h3 className="text-lg font-black text-sky-950 uppercase italic tracking-wide">Storico Update in Tempo Reale</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Feed delle notifiche push inviate e dei risultati registrati</p>
          </div>
          {notifications.length > 0 && (
            <button
              id="clear-notifications-history-btn"
              onClick={onClearNotifications}
              className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-600 border-2 border-red-200 rounded-full py-1.5 px-3 hover:bg-red-50/50 transition-all"
            >
              Svuota Feed
            </button>
          )}
        </div>

        {/* Scrollable update stack */}
        <div id="notifications-scrollable-feed" className="flex-1 overflow-y-auto pr-1 space-y-4">
          {notifications.length === 0 ? (
            <div id="no-notifications-placeholder" className="h-full flex flex-col justify-center items-center text-center text-gray-400 py-12">
              <Bell className="w-12 h-12 text-slate-250 md:mb-3 stroke-[1.5]" />
              <p className="text-sm font-black text-slate-500 uppercase tracking-wider">Nessuna notifica registrata nel feed</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-xs">
                Invia una notifica manuale a sinistra, oppure gioca un match live per vedere i risultati in tempo reale autogenerati!
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif, index) => {
                const getBannerColor = (type: NotificationLog['type']) => {
                  switch (type) {
                    case 'live_update': return 'border-l-[6px] border-l-red-500 bg-red-50/50';
                    case 'result': return 'border-l-[6px] border-l-amber-500 bg-amber-50/40';
                    case 'schedule_change': return 'border-l-[6px] border-l-orange-500 bg-orange-50/30';
                    case 'system': return 'border-l-[6px] border-l-indigo-505 bg-indigo-50/20';
                  }
                };

                const getBadgeLabelType = (type: NotificationLog['type']) => {
                  switch (type) {
                    case 'live_update': return 'LIVE 🎙️';
                    case 'result': return 'RISULTATO 🏆';
                    case 'schedule_change': return 'PROGRAMMA ⏰';
                    case 'system': return 'ANNUNCIO 🏟️';
                  }
                };

                const getIconType = (type: NotificationLog['type']) => {
                  switch (type) {
                    case 'live_update': return <Smartphone className="w-4 h-4 text-red-600 stroke-[2.5]" />;
                    case 'result': return <Sparkles className="w-4 h-4 text-amber-600 stroke-[2.5]" />;
                    case 'schedule_change': return <Calendar className="w-4 h-4 text-orange-600 stroke-[2.5]" />;
                    case 'system': return <Mail className="w-4 h-4 text-indigo-600 stroke-[2.5]" />;
                  }
                };

                return (
                  <motion.div
                    key={notif.id}
                    id={`notif-${notif.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-5 rounded-2xl border-2 border-slate-100 flex items-start gap-4 transition-all hover:shadow-md ${getBannerColor(notif.type)}`}
                  >
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-150 shrink-0">
                      {getIconType(notif.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          {getBadgeLabelType(notif.type)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-extrabold font-mono">{notif.time}</span>
                      </div>
                      <h4 id={`notif-title-${notif.id}`} className="font-extrabold text-slate-800 text-sm leading-tight pt-0.5">{notif.title}</h4>
                      <p id={`notif-body-${notif.id}`} className="text-xs font-semibold text-slate-600 leading-relaxed pt-1 whitespace-pre-line">{notif.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
