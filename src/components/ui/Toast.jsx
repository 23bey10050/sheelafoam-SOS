import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: '#30D158',
  error: '#FF453A',
  warning: '#FF9F0A',
  info: '#0071E3',
};

export function ToastContainer() {
  const { state, dispatch } = useApp();

  return (
    <div className="toast">
      <AnimatePresence>
        {state.toast && (
          <motion.div
            key={state.toast.id}
            initial={{ opacity: 0, x: 60, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="toast-item"
          >
            {(() => {
              const Icon = ICONS[state.toast.type] || Info;
              const color = COLORS[state.toast.type] || COLORS.info;
              return (
                <>
                  <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {state.toast.message}
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_TOAST' })}
                    className="btn-ghost"
                    style={{ padding: '2px', flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;
