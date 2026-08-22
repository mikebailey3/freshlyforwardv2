export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-neutral-500">Loading FreshlyForward…</p>
      </div>
    </div>
  )
}
