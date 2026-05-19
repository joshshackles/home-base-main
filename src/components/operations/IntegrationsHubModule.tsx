import { IntegrationConnectionStatus, IntegrationEventStatus, IntegrationProvider } from "@prisma/client";
import type { getIntegrationsHubModule } from "@/lib/operations/modules";
import { integrationProviderOptions, QUICKBOOKS_SETUP_PROFILE } from "@/lib/integrations-hub";
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
  if (status === "ERROR" || status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "CONNECTED" || status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DISABLED" || status === "SKIPPED") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div></div>;
}

function ReadinessCard({ item }: { item: Data["readiness"][number] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{item.category}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{item.label}</h3>
        </div>
        <div className="flex flex-col gap-1">
          {item.realConnectionV1 ? <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">Real v1</span> : null}
          <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${item.configured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{item.configured ? "Ready" : "Needs env"}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-600">{item.description}</p>
      <div className="mt-4 grid gap-3 text-xs font-bold text-slate-600">
        <div className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">Required env:</span> {item.requiredEnv.length ? item.requiredEnv.join(", ") : "None"}</div>
        {item.missingRequiredEnv.length ? <div className="rounded-2xl bg-rose-50 p-3 text-rose-700"><span className="font-black">Missing:</span> {item.missingRequiredEnv.join(", ")}</div> : <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">All required environment variables are present.</div>}
        {item.configuredOptionalEnv.length ? <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><span className="font-black">Optional configured:</span> {item.configuredOptionalEnv.join(", ")}</div> : null}
        {item.webhookPath ? <div className="rounded-2xl bg-slate-950 p-3 text-white"><span className="font-black">Webhook endpoint:</span> {item.webhookPath}</div> : null}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">{item.docsHint}</p>
    </div>
  );
}

function QuickBooksSetupCard({ action }: { action?: Action }) {
  const quickBooksSpec = QUICKBOOKS_SETUP_PROFILE;
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">QuickBooks focus</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">QuickBooks setup wizard</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">Create the QuickBooks connection with guided company, realm, sync, callback, webhook, and OAuth fields instead of freeform JSON. Tokens stay external; HomeBase stores token lifecycle metadata only.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-xs font-black text-emerald-700">OAuth scope: {quickBooksSpec.oauthScopes[0]}</div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <form action={action} className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div><h3 className="text-lg font-black text-slate-950">Add QuickBooks company</h3><p className="text-sm font-semibold text-slate-500">Use this for the first connection record before starting OAuth and token lifecycle tracking.</p></div>
          <input type="hidden" name="provider" value={IntegrationProvider.QUICKBOOKS} />
          <Field label="Display name"><Input name="displayName" placeholder="Joplin portfolio QuickBooks" /></Field>
          <Field label="QuickBooks company name"><Input name="quickBooksCompanyName" placeholder="Home Base Rentals LLC" required /></Field>
          <Field label="Realm ID / company ID"><Input name="quickBooksRealmId" placeholder="Optional until OAuth callback returns it" /></Field>
          <Field label="Environment"><Select name="quickBooksEnvironment" defaultValue="sandbox"><option value="sandbox">Sandbox</option><option value="production">Production</option></Select></Field>
          <div className="grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="syncInvoices" defaultChecked /> Invoices</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="syncPayments" defaultChecked /> Payments</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="syncVendorBills" defaultChecked /> Vendor bills</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="syncOwnerPayouts" defaultChecked /> Owner payouts</label>
          </div>
          <Field label="Default income account"><Input name="defaultIncomeAccount" placeholder="Rental Income" /></Field>
          <Field label="Default deposit account"><Input name="defaultDepositAccount" placeholder="Undeposited Funds" /></Field>
          {action ? <Submit>Create QuickBooks connection</Submit> : <p className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">QuickBooks action is not wired for this role.</p>}
        </form>
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Environment checklist</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Copy these names into Vercel. Values are intentionally blank here.</p>
          <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-bold text-white">{quickBooksSpec.envTemplate.join("\n")}</pre>
          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">Callback:</span> {quickBooksSpec.redirectUri}</div>
            <div className="rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-950">Webhook:</span> {quickBooksSpec.webhookPath}</div>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Setup checklist</h3>
          <ol className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
            {quickBooksSpec.connectionChecklist.map((item, index) => <li key={item} className="flex gap-2"><span className="font-black text-emerald-700">{index + 1}.</span><span>{item}</span></li>)}
          </ol>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Sync objects: {quickBooksSpec.syncObjects.join(", ")}</div>
        </div>
      </div>
    </section>
  );
}

export function IntegrationsHubModule({ data, actions }: { data: Data; actions: { createConnection: Action; updateConnectionStatus: Action; createEvent: Action; runDiagnostic: Action; createQuickBooksConnection?: Action } }) {
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Update 12.5</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Integrations Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">Provider readiness checks, safe configuration tracking, webhook reference, diagnostics, and audit events for Stripe, Plaid, Twilio, SendGrid/Postmark, S3/R2, QuickBooks, Google Calendar, maps, and screening providers.</p>
      </section>

      <QuickBooksSetupCard action={actions.createQuickBooksConnection} />

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Integrations v1</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Real connections: Stripe, email, QuickBooks</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">OAuth/webhook/token lifecycle, sync logs, retries, and diagnostics are enabled first for the highest-value providers.</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs font-black text-blue-700">Webhook paths: /api/stripe/webhook, /api/webhooks/email, /api/webhooks/quickbooks</div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {data.realConnections.map((connection) => (
            <div key={connection.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{connection.displayName}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleCase(connection.provider)}{connection.accountReference ? ` - ${connection.accountReference}` : ""}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(connection.status)}`}>{titleCase(connection.status)}</span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                <div className="rounded-xl bg-slate-50 p-2">Last sync: {connection.lastSyncAt ? connection.lastSyncAt.toLocaleString() : "Not synced"}</div>
                <div className="rounded-xl bg-slate-50 p-2">Token lifecycle: external token store, metadata only</div>
                {connection.lastError ? <div className="rounded-xl bg-rose-50 p-2 text-rose-700">{connection.lastError}</div> : null}
              </div>
              {connection.provider === IntegrationProvider.QUICKBOOKS ? <a href={`/api/integrations/quickbooks/start?connectionId=${connection.id}`} className="mt-3 inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Start OAuth</a> : null}
            </div>
          ))}
          {data.realConnections.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600 lg:col-span-3">Create a Stripe, SendGrid/Postmark, or QuickBooks connection to activate real v1 controls.</p> : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Connections" value={data.counts.connections} />
        <Metric label="Connected" value={data.counts.connected} />
        <Metric label="Errors" value={data.counts.errors} />
        <Metric label="Tracked providers" value={data.counts.providers} />
        <Metric label="Env-ready providers" value={data.counts.readyProviders} />
        <Metric label="Missing env vars" value={data.counts.missingEnvironment} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form action={actions.createConnection} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Add provider</h2><p className="text-sm font-semibold text-slate-500">Store provider status and non-secret configuration notes. Fields that look like secrets are rejected; real credentials belong in Vercel environment variables.</p></div>
          <Field label="Provider"><Select name="provider">{integrationProviderOptions.map((provider) => <option key={provider} value={provider}>{titleCase(provider)}</option>)}</Select></Field>
          <Field label="Display name"><Input name="displayName" placeholder="Stripe production" required /></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationConnectionStatus.CONFIGURED}>{Object.values(IntegrationConnectionStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <Field label="Account reference"><Input name="accountReference" placeholder="acct_, realm ID, bucket, sender domain" /></Field>
          <Field label="Safe config JSON"><Textarea name="configJson" placeholder={'{"webhookPath":"/api/webhooks/quickbooks","mode":"sandbox"}'} /></Field>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" name="markSynced" /> Mark synced now</label>
          <Field label="Last error"><Textarea name="lastError" placeholder="Only used when status is Error" /></Field>
          <Submit>Create connection</Submit>
        </form>

        <form action={actions.updateConnectionStatus} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Update status</h2><p className="text-sm font-semibold text-slate-500">Use this after testing credentials, webhooks, sync jobs, or provider health checks.</p></div>
          <Field label="Connection"><Select name="connectionId" required><option value="">Select connection</option>{data.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.displayName} - {titleCase(connection.provider)}</option>)}</Select></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationConnectionStatus.CONNECTED}>{Object.values(IntegrationConnectionStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" name="markSynced" /> Mark synced now</label>
          <Field label="Error details"><Textarea name="lastError" placeholder="Webhook failed, token expired, API permission missing..." /></Field>
          <Submit>Save status</Submit>
        </form>

        <form action={actions.runDiagnostic} className="space-y-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div><h2 className="text-lg font-black text-slate-950">Run readiness diagnostic</h2><p className="text-sm font-semibold text-slate-600">Checks whether the selected provider has its required environment variables configured, updates connection status, and writes an integration event.</p></div>
          <Field label="Connection"><Select name="connectionId" required><option value="">Select connection</option>{data.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.displayName} - {titleCase(connection.provider)}</option>)}</Select></Field>
          <Submit>Run diagnostic</Submit>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-black text-slate-950">Provider readiness catalog</h2><p className="text-sm font-semibold text-slate-500">This detects environment-variable presence only. It does not expose secret values and does not call third-party APIs during page render.</p></div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500">{data.counts.readyProviders} of {data.readiness.length} ready</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.readiness.map((item) => <ReadinessCard key={item.provider} item={item} />)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form action={actions.createEvent} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <div><h2 className="text-lg font-black text-slate-950">Log event</h2><p className="text-sm font-semibold text-slate-500">Record webhook, sync, export, import, map lookup, SMS/email, accounting, or screening activity.</p></div>
          <Field label="Connection"><Select name="connectionId"><option value="">No linked connection</option>{data.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.displayName}</option>)}</Select></Field>
          <Field label="Provider"><Select name="provider">{integrationProviderOptions.map((provider) => <option key={provider} value={provider}>{titleCase(provider)}</option>)}</Select></Field>
          <Field label="Event type"><Input name="eventType" placeholder="webhook.received" required /></Field>
          <Field label="Status"><Select name="status" defaultValue={IntegrationEventStatus.SUCCESS}>{Object.values(IntegrationEventStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>
          <Field label="Summary"><Textarea name="summary" placeholder="Processed Stripe payment webhook" /></Field>
          <Field label="Safe payload JSON"><Textarea name="configJson" placeholder={'{"objectId":"evt_123","records":4}'} /></Field>
          <Submit>Log event</Submit>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-black text-slate-950">Provider connections</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {data.connections.length ? data.connections.map((connection) => <div key={connection.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{connection.displayName}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleCase(connection.provider)}{connection.accountReference ? ` - ${connection.accountReference}` : ""}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(connection.status)}`}>{titleCase(connection.status)}</span></div>{connection.lastError ? <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{connection.lastError}</p> : null}<p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{connection.lastSyncAt ? `Last sync ${connection.lastSyncAt.toLocaleString()}` : "Not synced yet"}</p></div>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">No provider connections are configured yet.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Integration events</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Metric label="Retryable failures" value={data.counts.retryableEvents} />
          <Metric label="Webhook logs" value={data.counts.webhookEvents} />
          <Metric label="OAuth logs" value={data.counts.oauthEvents} />
          <Metric label="Sync logs" value={data.counts.syncEvents} />
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {data.events.length ? data.events.map((event) => <div key={event.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{event.eventType}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleCase(event.provider)}{event.connection?.displayName ? ` - ${event.connection.displayName}` : ""}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(event.status)}`}>{titleCase(event.status)}</span></div>{event.summary ? <p className="mt-2 text-sm font-semibold text-slate-600">{event.summary}</p> : null}<p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{event.createdAt.toLocaleString()}</p></div>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">No integration events have been recorded yet.</p>}
        </div>
      </section>
    </main>
  );
}
