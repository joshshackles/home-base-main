export default function UnitWorkspaceLoading() {
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
      <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[360px_1fr]">
          <div className="min-h-72 animate-pulse bg-slate-200" />
          <div className="space-y-4 p-6 lg:p-8">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          </div>
        </div>
      </section>
      <div className="mt-6 flex gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-9 w-28 shrink-0 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </main>
  );
}
