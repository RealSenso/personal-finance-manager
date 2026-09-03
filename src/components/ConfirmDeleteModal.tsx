import React from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Wallet, 
  PiggyBank, 
  Receipt 
} from 'lucide-react';

export interface ConfirmDeleteState {
  isOpen: boolean;
  type: 'bucket' | 'transaction' | 'reset' | 'rule';
  title: string;
  description: string;
  itemId: string;
  itemName?: string;
  meta?: Record<string, any>;
}

interface ConfirmDeleteModalProps {
  state: ConfirmDeleteState;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  state,
  onClose,
  onConfirm,
}) => {
  if (!state.isOpen) return null;

  const getIcon = () => {
    switch (state.type) {
      case 'bucket':
        return <Wallet className="w-5 h-5 text-rose-400" />;
      case 'transaction':
        return <Receipt className="w-5 h-5 text-rose-400" />;
      case 'reset':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                {state.title}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Confirm deletion action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {state.itemName && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider block">
                  Target item
                </span>
                <span className="text-sm font-bold text-zinc-100 truncate block">
                  {state.itemName}
                </span>
              </div>
            </div>
          )}

          <p className="text-zinc-300 leading-relaxed text-xs">
            {state.description}
          </p>

          <p className="text-[11px] text-zinc-500 font-mono">
            Note: This action cannot be undone. You can export a backup beforehand from the Export menu if needed.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
