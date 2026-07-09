import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, HelpCircle, X } from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextProps {
  alert: (options: DialogOptions | string) => Promise<void>;
  confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions;
  resolve: (value: any) => void;
  isConfirm: boolean;
}

const defaultOptions: DialogOptions = {
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK',
  cancelText: 'Annulla'
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    options: defaultOptions,
    resolve: () => {},
    isConfirm: false
  });

  const showDialog = (options: DialogOptions | string, isConfirm: boolean): Promise<any> => {
    return new Promise((resolve) => {
      const parsedOptions: DialogOptions = typeof options === 'string' 
        ? { message: options, type: isConfirm ? 'confirm' : 'info' } 
        : { ...options, type: options.type || (isConfirm ? 'confirm' : 'info') };

      setState({
        isOpen: true,
        options: parsedOptions,
        resolve,
        isConfirm
      });
    });
  };

  const alert = (options: DialogOptions | string): Promise<void> => {
    return showDialog(options, false);
  };

  const confirm = (options: DialogOptions | string): Promise<boolean> => {
    return showDialog(options, true);
  };

  const handleClose = (value: boolean) => {
    setState((prev) => ({ ...prev, isOpen: false }));
    // Wait for exit animation before resolving
    setTimeout(() => {
      state.resolve(value);
    }, 150);
  };

  const getIcon = (type?: DialogType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="w-12 h-12 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-rose-500" />;
      case 'confirm':
        return <HelpCircle className="w-12 h-12 text-blue-400" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-indigo-400" />;
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <AnimatePresence>
        {state.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !state.isConfirm && handleClose(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 overflow-hidden"
            >
              {/* Close Button for info/alerts */}
              {!state.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Icon */}
              <div className="p-3 bg-slate-950/40 rounded-full border border-slate-800/60 shadow-inner">
                {getIcon(state.options.type)}
              </div>

              {/* Content */}
              <div className="space-y-1.5 w-full">
                {state.options.title && (
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {state.options.title}
                  </h3>
                )}
                <p className="text-sm font-bold text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {state.options.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full pt-2">
                {state.isConfirm ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClose(false)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {state.options.cancelText || 'Annulla'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClose(true)}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 transition-all font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {state.options.confirmText || 'Conferma'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 transition-all font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {state.options.confirmText || 'OK'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
