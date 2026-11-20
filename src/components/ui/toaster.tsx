import React from 'react';
import { useToast } from '@/hooks/useToast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full font-serif">
      {toasts.map((t) => {
        const isSuccess = t.variant === 'success';
        const isDestructive = t.variant === 'destructive';

        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all ${
              isDestructive
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-[#E7E2D7] text-[#171717]'
            }`}
          >
            {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />}
            {isDestructive && <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />}
            {!isSuccess && !isDestructive && <Info className="w-5 h-5 text-[#C49A35] mt-0.5 shrink-0" />}

            <div className="flex-1 text-sm">
              {t.title && <p className="font-semibold">{t.title}</p>}
              {t.description && <p className="text-xs opacity-90 mt-0.5">{t.description}</p>}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
