import { create } from "zustand";

export type ToastType = "error" | "success" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, action?: ToastAction) => void;
  removeToast: (id: number) => void;
}

let nextId = 0;
const pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();

function clearTimer(id: number) {
  const timer = pendingTimers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    pendingTimers.delete(id);
  }
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, action }] }));
    const timer = setTimeout(() => {
      pendingTimers.delete(id);
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
    pendingTimers.set(id, timer);
  },
  removeToast: (id) => {
    clearTimer(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function toastError(message: string, action?: { label: string; onClick: () => void }) {
  useToastStore.getState().addToast("error", message, action);
}

export function toastSuccess(message: string, action?: { label: string; onClick: () => void }) {
  useToastStore.getState().addToast("success", message, action);
}

export function toastWarning(message: string, action?: { label: string; onClick: () => void }) {
  useToastStore.getState().addToast("warning", message, action);
}
