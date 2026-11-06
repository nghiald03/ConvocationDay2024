import type { ReactNode } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

/**
 * Toast facade backed by shadcn/ui's Sonner.
 *
 * The app was written against react-hot-toast, whose `toast.promise()` returns the
 * original promise (resolved value, and rejection rethrown). Sonner's version returns
 * a different object, so we keep the old contract here and let every call site stay as is.
 */
type ValueOrFn<T, A> = T | ((arg: A) => T);

interface PromiseMessages<TData> {
  loading: ReactNode;
  success: ValueOrFn<ReactNode, TData>;
  error: ValueOrFn<ReactNode, any>;
}

function show(message: ReactNode, options?: ExternalToast) {
  return sonner(message, options);
}

function promise<TData>(
  source: Promise<TData>,
  messages: PromiseMessages<TData>,
  options?: ExternalToast,
): Promise<TData> {
  sonner.promise(source, {
    loading: messages.loading,
    success: messages.success as (data: TData) => ReactNode,
    error: messages.error as (error: unknown) => ReactNode,
    ...options,
  });
  return source;
}

export const toast = Object.assign(show, {
  success: (message: ReactNode, options?: ExternalToast) => sonner.success(message, options),
  error: (message: ReactNode, options?: ExternalToast) => sonner.error(message, options),
  info: (message: ReactNode, options?: ExternalToast) => sonner.info(message, options),
  warning: (message: ReactNode, options?: ExternalToast) => sonner.warning(message, options),
  loading: (message: ReactNode, options?: ExternalToast) => sonner.loading(message, options),
  dismiss: (id?: string | number) => sonner.dismiss(id),
  promise,
});

export default toast;
