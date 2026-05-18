import { IntegrationConnectionStatus, IntegrationEventStatus } from "@prisma/client";
import type { getIntegrationsHubModule } from "@/lib/operations/modules";
import { integrationProviderOptions } from "@/lib/integrations-hub";
import { titleCase } from "@/lib/operations/modules";

type Data = Awaited<ReturnType<typeof getIntegrationsHubModule>>;
type Action = (formData: FormData) => Promise<void>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-500"><span>{label}</span>{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" />;
}

function Submit({ children }: { children: React.ReactNode }) {
  return <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">{children}</button>;
}

function statusTone(status: string) {
  if (["ERROR", "FAILED"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["CONNECTED", "SUCCESS"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["DISABLED", "SKIPPED"].includes(status)) return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div></div>;
}

export function IntegrationsHubModule({ data, actions }: { data: Data; actions: { createConnection: Action; updateConnectionStatus: Action; createEvent: Action } }) {
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Update 12</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Integrations Hub</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">Configure and track provider connections for Stripe, Plaid, Twilio, SendGrid/Postmark, S3/R2, QuickBooks, Google Calendar, maps, and screening providers.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Connections" value={data.counts.connections} />
        <Metric label="Connected" value={data.counts.connected} />
        <Metric label="Errors" value={data.counts.errors} />
        <Metric label="Providers" value={data.counts.providers} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form action={actions.createConnection} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Add provider</h2><p className="text-sm font-semibold text-slate-500">Store provider status and non-secret configuration notes. Put real API secrets in environment variables or your secret manager.</p></div>
          <Field label="Provider"><Select name="provider">{integrationProviderOptions.map((provider) => <option key={provider} value={provider}>{titleCase(provider)}</option>)}</Select></Field>
          <Field label="Display name"><Input name="displayName" placeholder="Stripe production" required /></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationConnectionStatus.CONFIGURED}>{Object.values(IntegrationConnectionStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <Field label="Account reference"><Input name="accountReference" placeholder="acct_, realm ID, bucket, sender domain" /></Field>
          <Field label="Config JSON"><Textarea name="configJson" placeholder={'{"webhookPath":"/api/webhooks/stripe","envKey":"STRIPE_SECRET_KEY"}'} /></Field>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" name="markSynced" /> Mark synced now</label>
          <Field label="Last error"><Textarea name="lastError" placeholder="Only used when status is Error" /></Field>
          <Submit>Create connection</Submit>
        </form>

        <form action={actions.updateConnectionStatus} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Update status</h2><p className="text-sm font-semibold text-slate-500">Use this after testing credentials, webhooks, sync jobs, or provider health checks.</p></div>
          <Field label="Connection"><Select name="connectionId" required><option value="">Select connection</option>{data.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.displayName} · {titleCase(connection.provider)}</option>)}</Select></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationConnectionStatus.CONNECTED}>{Object.values(IntegrationConnectionStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" name="markSynced" /> Mark synced now</label>
          <Field label="Error details"><Textarea name="lastError" placeholder="Webhook failed, token expired, API permission missing..." /></Field>
          <Submit>Save status</Submit>
        </form>

        <form action={actions.createEvent} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Log event</h2><p className="text-sm font-semibold text-slate-500">Record webhook, sync, export, import, map lookup, SMS/email, accounting, or screening activity.</p></div>
          <Field label="Connection"><Select name="connectionId"><option value="">No linked connection</option>{data.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.displayName}</option>)}</Select></Field>
          <Field label="Provider"><Select name="provider">{integrationProviderOptions.map((provider) => <option key={provider} value={provider}>{titleCase(provider)}</option>)}</Select></Field>
          <Field label="Event type"><Input name="eventType" placeholder="webhook.received" required /></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationEventStatus.SUCCESS}>{Object.values(IntegrationEventStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <Field label="Summary"><Textarea name="summary" placeholder="Processed Stripe payment webhook" /></Field>
          <Field label="Payload JSON"><Textarea name="configJson" placeholder={'{"objectId":"evt_123","records":4}'} /></Field>
          <Submit>Log event</Submit>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Provider connections</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {data.connections.length ? data.connections.map((connection) => <div key={connection.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{connection.displayName}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleCase(connection.provider)}{connection.accountReference ? ` · ${connection.accountReference}` : ""}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(connection.status)}`}>{titleCase(connection.status)}</span></div>{connection.lastError ? <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{connection.lastError}</p> : null}<p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{connection.lastSyncAt ? `Last sync ${connection.lastSyncAt.toLocaleString()}` : "Not synced yet"}</p></div>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">No provider connections are configured yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Integration events</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {data.events.length ? data.events.map((event) => <div key={event.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{event.eventType}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleCase(event.provider)}{event.connection?.displayName ? ` · ${event.connection.displayName}` : ""}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(event.status)}`}>{titleCase(event.status)}</span></div>{event.summary ? <p className="mt-2 text-sm font-semibold text-slate-600">{event.summary}</p> : null}<p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{event.createdAt.toLocaleString()}</p></div>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">No integration events have been recorded yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
