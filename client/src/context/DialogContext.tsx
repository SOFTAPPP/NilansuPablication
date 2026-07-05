import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface DialogContextType {
  confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOptions & { resolve: (value: boolean) => void }) | null>(null);

  const confirm = useCallback((options: DialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === 'string') {
        setDialog({ message: options, resolve, type: 'warning' });
      } else {
        setDialog({ ...options, resolve });
      }
    });
  }, []);

  const handleConfirm = () => {
    if (dialog) dialog.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    if (dialog) dialog.resolve(false);
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={handleCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-surface border border-divider shadow-2xl rounded-2xl p-6 max-w-md w-full overflow-hidden"
            >
              <div className="flex gap-4 items-start mb-6">
                <div className={`p-3 rounded-full flex-shrink-0 ${
                  dialog.type === 'danger' ? 'bg-danger/10 text-danger' : 
                  dialog.type === 'warning' ? 'bg-warning/10 text-warning' : 
                  'bg-primary/10 text-primary'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-bold text-textPrimary tracking-tight mb-2">
                    {dialog.title || (dialog.type === 'danger' ? 'Warning' : 'Confirm Action')}
                  </h3>
                  <p className="text-textSecondary text-sm leading-relaxed">
                    {dialog.message}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-divider/50">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm text-textSecondary hover:text-textPrimary hover:bg-muted transition-colors"
                >
                  {dialog.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors ${
                    dialog.type === 'danger' 
                      ? 'bg-danger text-white hover:bg-danger/90' 
                      : dialog.type === 'warning'
                      ? 'bg-warning text-white hover:bg-warning/90'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {dialog.confirmText || 'Yes, Continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within a DialogProvider');
  return context;
}
