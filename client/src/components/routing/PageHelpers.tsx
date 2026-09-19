import type { ReactNode } from 'react';

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-r-transparent" />
    </div>
  );
}

export function PagePlaceholder({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-content">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-content-muted">{description}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
