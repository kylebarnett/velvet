export default function ShareTearSheetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
