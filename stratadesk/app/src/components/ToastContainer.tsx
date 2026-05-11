import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 120, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 120, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-glass-lg border"
            style={{
              background: 'rgba(1, 42, 74, 0.92)',
              backdropFilter: 'blur(24px)',
              borderColor: toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : toast.type === 'info'
                ? 'rgba(70, 143, 175, 0.3)'
                : 'rgba(34, 197, 94, 0.25)',
              borderLeftWidth: '3px',
              borderLeftColor: toast.type === 'error'
                ? '#ef4444'
                : toast.type === 'info'
                ? '#468faf'
                : '#22c55e',
              minWidth: 280,
            }}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-reef flex-shrink-0" />}
            <span className="text-sm text-foam font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-shallows hover:text-foam transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
