import { create } from "zustand";

export type ToastType = "error" | "success" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toastError(message: string) {
  useToastStore.getState().addToast("error", message);
}

export function toastSuccess(message: string) {
  useToastStore.getState().addToast("success", message);
}

export function toastWarning(message: string) {
  useToastStore.getState().addToast("warning", message);
}
