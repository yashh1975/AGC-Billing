import { useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

let listeners: Array<(toasts: ToastItem[]) => void> = [];
let memoryToasts: ToastItem[] = [];

function notify() {
  listeners.forEach((listener) => listener([...memoryToasts]));
}

export function toast(props: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = { ...props, id };
  memoryToasts = [...memoryToasts, newToast];
  notify();

  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryToasts);

  useState(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  });

  const dismiss = useCallback((id: string) => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts, toast, dismiss };
}
