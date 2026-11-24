"use client";
import { useEffect, useRef, useState } from "react";
import {
  TreePine,
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarDays,
  Files,
  ChartNoAxesCombined,
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock3,
  Check,
  CheckCheck,
  ClipboardList,
  ShieldCheck,
  LockKeyhole,
  LogOut,
  Download,
  X,
  Camera,
  Paperclip,
  AlertCircle,
  Trash2,
  Printer,
  Save,
  Mail,
  Phone,
  CheckCircle2,
  Wallet,
  Menu,
} from "lucide-react";
import {
  Job,
  Cost,
  DraftDocument,
  Attachment,
  stages,
  categories,
  newJob,
  createDraft,
  formatMoney,
  summarize,
  missedCosts,
  lineTotal,
} from "@/lib/domain";

import Books from "./books";

type View = "Overview" | "Jobs" | "Calendar" | "Drafts" | "Costs" | "Books & taxes";
type Tab =
  | "Overview"
  | "Details"
  | "Checklist"
  | "Costs & payments"
  | "Photos"
  | "Documents";
const nav = [
  { label: "Overview" as const, Icon: LayoutDashboard },
  { label: "Jobs" as const, Icon: BriefcaseBusiness },
  { label: "Calendar" as const, Icon: CalendarDays },
  { label: "Drafts" as const, Icon: Files },
  { label: "Books & taxes" as const, Icon: Wallet },
  { label: "Costs" as const, Icon: ChartNoAxesCombined },
];
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const location = (j: Job) =>
  [j.city, j.state, j.zip]
    .filter(Boolean)
    .join(", ")
    .replace(/, (\d)/, " $1");
const inputNumber = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : Number(v);
const inputMoney = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : Math.round(Number(v) * 100);
const dollars = (v: number | null) => (v === null ? "" : (v / 100).toFixed(2));
const uid = () => crypto.randomUUID();
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to save. Try again.");
  return data;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  Icon = ClipboardList,
  title,
  children,
  action,
}: {
  Icon?: typeof ClipboardList;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "wide" : ""}>
      {label}
      {children}
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide-modal" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function Hub({
  initialJobs,
  ownerName,
}: {
  initialJobs: Job[];
  ownerName: string;
}) {
  const [jobs, setJobs] = useState(initialJobs),
    [view, setView] = useState<View>("Overview"),
    [job, setJob] = useState<Job | null>(null),
    [tab, setTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("All stages"),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [document, setDocument] = useState<{ jobId: string; id: string } | null>(
      null,
    );
  const saving = useRef(false);
  const savedJob = jobs.find((j) => j.id === job?.id),
    dirty = !!job && JSON.stringify(job) !== JSON.stringify(savedJob);
  const active = jobs.filter((j) => !["Complete", "Closed"].includes(j.stage));
  const filtered = jobs
    .filter((j) =>
      `${j.title} ${j.customer} ${location(j)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter((j) => statusFilter === "All stages" || j.stage === statusFilter);
  const allDocs = jobs.flatMap((j) =>
    j.documents.map((d) => ({ job: j, doc: d })),
  );
  const nextLead = active.find((j) => j.stage === "New lead") || active[0];
  const events = jobs
    .flatMap((j) => j.events.map((e) => ({ ...e, job: j })))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  function leave() {
    return (
      !dirty ||
      window.confirm("You have unsaved changes. Leave without saving?")
    );
  }
  function open(j: Job) {
    if (!leave()) return;
    setJob(structuredClone(j));
    setTab("Overview");
    setError("");
    setMenu(false);
  }
  function navigate(v: View) {
    if (!leave()) return;
    setView(v);
    setJob(null);
    setError("");
    setSearch("");
    setStatusFilter("All stages");
    setMenu(false);
  }
  async function save(j: Job, create = false) {
    if (saving.current) return null;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ job: Job }>(
        create ? "/api/jobs" : `/api/jobs/${j.id}`,
        {
          method: create ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(j),
        },
      );
      setJobs((prev) => [
        data.job,
        ...prev.filter((x) => x.id !== data.job.id),
      ]);
      if (job?.id === j.id || create) setJob(data.job);
      setNotice(create ? "Job created privately." : "Changes saved.");
      return data.job;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const patch = (update: Partial<Job>) =>
    setJob((j) => (j ? { ...j, ...update } : j));
  const selectedDoc = document
    ? (job?.id === document.jobId
        ? job
        : jobs.find((j) => j.id === document.jobId)
      )?.documents.find((d) => d.id === document.id)
    : null;
  async function makeDoc(kind: DraftDocument["kind"]) {
    if (!job) return;
    const draft = createDraft(job, kind);
    const next = { ...job, documents: [draft, ...job.documents] };
    setJob(next);
    const saved = await save(next);
    if (saved) setDocument({ jobId: job.id, id: draft.id });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <button
          className="icon-button mobile-menu sidebar-close"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={18} />
        </button>
        <button
          className="brand brand-button"
          onClick={() => navigate("Overview")}
        >
          <span className="brand-icon">
            <TreePine size={32} />
          </span>
          <span>
            MAPLE RIDGE<small>BUSINESS HUB</small>
          </span>
        </button>
        <div className="sidebar-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ label, Icon }) => (
            <button
              key={label}
              className={!job && view === label ? "active" : ""}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Drafts" && allDocs.length > 0 && (
                <b>{allDocs.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={22} />
          <strong>A space for your business.</strong>
          <p>
            Private records.
            <br />
            Every customer document stays a draft.
          </p>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">MZ</div>
          <div>
            <strong>{ownerName}</strong>
            <small>Owner · Maple Ridge</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={async () => {
              if (!leave()) return;
              try {
                await api("/api/auth/sign-out", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                window.location.assign("/sign-in");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{job ? "Job details" : view}</strong>
          </div>
          <div className="topbar-right">
            <span className="privacy">
              <LockKeyhole size={13} /> Private workspace
            </span>
            <span className="today">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "America/New_York",
              })}
            </span>
          </div>
        </header>
        <main className="main" id="main-content">
          {error && (
            <div role="alert" className="alert error">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {job ? (
            <>
              <button
                className="back-button"
                onClick={() => {
                  if (leave()) {
                    setJob(null);
                    setError("");
                  }
                }}
              >
                <ArrowLeft size={16} /> Back to {view.toLowerCase()}
              </button>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {job.customer.toUpperCase()} · JOB RECORD
                  </div>
                  <h1>{job.title}</h1>
                  <p>
                    <MapPin size={15} />
                    {location(job) || "Location to be confirmed"}
                    <span className="dot">·</span>
                    {job.urgency === "ASAP"
                      ? "Requested ASAP"
                      : job.urgency + " timing"}
                  </p>
                </div>
                <div className="heading-actions">
                  <Badge tone={job.urgency === "ASAP" ? "amber" : "green"}>
                    {job.stage}
                  </Badge>
                  <button
                    className="primary"
                    disabled={busy || !dirty}
                    onClick={() => save(job)}
                  >
                    <Save size={16} />
                    {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
                  </button>
                </div>
              </div>
              <div
                className="job-tabs"
                role="tablist"
                aria-label="Job sections"
              >
                {(
                  [
                    "Overview",
                    "Details",
                    "Checklist",
                    "Costs & payments",
                    "Photos",
                    "Documents",
                  ] as Tab[]
                ).map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                    {t === "Documents" && job.documents.length > 0 && (
                      <span>{job.documents.length}</span>
                    )}
                  </button>
                ))}
              </div>
              {tab === "Overview" && (
                <div className="detail-grid">
                  <div>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Scope at a glance</h2>
                        <button
                          className="text-button"
                          onClick={() => setTab("Details")}
                        >
                          Edit details <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <p className="scope-text">
                        {job.scope ||
                          "Add the work requested and what needs to be confirmed."}
                      </p>
                      <div className="facts">
                        <div>
                          <span>Customer</span>
                          <strong>{job.customer}</strong>
                        </div>
                        <div>
                          <span>Windows</span>
                          <strong>
                            {job.windowMin === null
                              ? "To be confirmed"
                              : job.windowMax !== null &&
                                  job.windowMax !== job.windowMin
                                ? `${job.windowMin}–${job.windowMax}`
                                : job.windowMin}
                          </strong>
                        </div>
                        <div>
                          <span>Window type</span>
                          <strong>{job.windowType || "To be confirmed"}</strong>
                        </div>
                        <div>
                          <span>Floor & access</span>
                          <strong>{job.access || "To be confirmed"}</strong>
                        </div>
                      </div>
                      <div className="contact-strip">
                        <span>
                          <Phone size={15} />
                          {job.phone || "Phone needed"}
                        </span>
                        <span>
                          <Mail size={15} />
                          {job.email || "Email needed"}
                        </span>
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Next steps</h2>
                        <button
                          className="text-button"
                          onClick={() => setTab("Checklist")}
                        >
                          Full checklist <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {job.checklist.length ? (
                        job.checklist
                          .filter((x) => !x.done)
                          .slice(0, 4)
                          .map((c) => (
                            <label className="check-row" key={c.id}>
                              <input
                                type="checkbox"
                                checked={c.done}
                                onChange={(e) =>
                                  patch({
                                    checklist: job.checklist.map((x) =>
                                      x.id === c.id
                                        ? { ...x, done: e.target.checked }
                                        : x,
                                    ),
                                  })
                                }
                              />
                              <span>{c.label}</span>
                            </label>
                          ))
                      ) : (
                        <p className="muted">
                          Add a checklist to keep the work moving.
                        </p>
                      )}
                      {job.checklist.length > 0 &&
                        job.checklist.every((c) => c.done) && (
                          <p className="success-line">
                            <CheckCircle2 size={18} /> All checklist items
                            complete.
                          </p>
                        )}
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Job notes</h2>
                      </div>
                      <textarea
                        aria-label="Job notes"
                        rows={5}
                        value={job.notes}
                        placeholder="Site conditions, customer preferences, and things to remember…"
                        onChange={(e) => patch({ notes: e.target.value })}
                      />
                      <p className="small-note">
                        Internal notes stay in your private workspace.
                      </p>
                    </section>
                  </div>
                  <div>
                    <section className="panel next-card">
                      <span className="eyebrow">KEEP IT MOVING</span>
                      <h2>
                        {job.stage === "New lead"
                          ? "Start with the details."
                          : "One step at a time."}
                      </h2>
                      <p>
                        {job.stage === "New lead"
                          ? "Confirm the scope and arrange a site visit before pricing the work."
                          : "Keep the record current as the job moves forward."}
                      </p>
                      <label>
                        Job stage
                        <select
                          value={job.stage}
                          onChange={(e) =>
                            patch({ stage: e.target.value as Job["stage"] })
                          }
                        >
                          {stages.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="secondary"
                        onClick={() => makeDoc("Customer message")}
                        disabled={busy}
                      >
                        <Mail size={16} /> Draft customer response
                      </button>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Job numbers</h2>
                        <Wallet size={18} />
                      </div>
                      <dl className="money-list">
                        <div>
                          <dt>Draft customer price</dt>
                          <dd>{formatMoney(job.quotedTotal)}</dd>
                        </div>
                        <div>
                          <dt>
                            Estimated cost
                            {!summarize(job).estimatedComplete
                              ? " (partial)"
                              : ""}
                          </dt>
                          <dd>
                            {job.costs.length
                              ? formatMoney(summarize(job).estimated)
                              : "Not entered"}
                          </dd>
                        </div>
                        <div>
                          <dt>Recorded payments</dt>
                          <dd>{formatMoney(summarize(job).paid)}</dd>
                        </div>
                      </dl>
                      <button
                        className="text-button"
                        onClick={() => setTab("Costs & payments")}
                      >
                        Open cost worksheet <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="review-note">
                      <ShieldCheck size={20} />
                      <div>
                        <strong>You stay in control.</strong>
                        <p>
                          Estimates, invoices, change orders, and messages stay
                          as drafts. Nothing is sent from this hub.
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              )}
              {tab === "Details" && <Details job={job} patch={patch} />}
              {tab === "Checklist" && <Checklist job={job} patch={patch} />}
              {tab === "Costs & payments" && <Costs job={job} patch={patch} />}
              {tab === "Photos" && (
                <Photos job={job} onError={setError} onNotice={setNotice} />
              )}
              {tab === "Documents" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Customer documents</h2>
                      <p className="muted">
                        Drafts for your review. Nothing is approved or sent.
                      </p>
                    </div>
                  </div>
                  <div className="draft-actions">
                    {(
                      [
                        "Estimate",
                        "Invoice",
                        "Change order",
                        "Customer message",
                      ] as const
                    ).map((kind) => (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => makeDoc(kind)}
                        key={kind}
                      >
                        <Plus size={15} /> Draft {kind.toLowerCase()}
                      </button>
                    ))}
                  </div>
                  {!job.documents.length ? (
                    <Empty
                      Icon={Files}
                      title="A clear paper trail starts here."
                    >
                      Create a draft when you’re ready. Prices stay blank until
                      you enter them.
                    </Empty>
                  ) : (
                    <div className="document-list">
                      {job.documents.map((d) => (
                        <button
                          key={d.id}
                          onClick={() =>
                            setDocument({ jobId: job.id, id: d.id })
                          }
                        >
                          <span className="file-icon">
                            <Files size={22} />
                          </span>
                          <span>
                            <strong>{d.title}</strong>
                            <small>
                              {dateLabel(d.createdAt.slice(0, 10))} ·{" "}
                              {formatMoney(d.quotedTotal)}
                            </small>
                          </span>
                          <Badge tone="amber">Draft</Badge>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {dirty && (
                <div className="save-bar">
                  <span>
                    <span className="unsaved-dot" /> Unsaved changes
                  </span>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => save(job)}
                  >
                    <Save size={16} />
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    MAPLE RIDGE HOME & PROPERTY SOLUTIONS LLC
                  </div>
                  <h1>
                    {view === "Overview"
                      ? `Good to see you, ${ownerName.split(" ")[0]}.`
                      : view === "Jobs"
                        ? "Every job, in one place."
                        : view === "Calendar"
                          ? "Make room for good work."
                          : view === "Drafts"
                            ? "Ready for your review."
                            : view === "Books & taxes" ? "Books & taxes" : "Know where each job stands."}
                  </h1>
                  <p>
                    {view === "Overview"
                      ? "Here’s what’s happening with your business."
                      : view === "Jobs"
                        ? "From the first conversation to the final payment."
                        : view === "Calendar"
                          ? "Site visits, work days, and follow-ups. All times are Eastern."
                          : view === "Drafts"
                            ? "Your estimates, invoices, change orders, and customer messages."
                            : view === "Books & taxes" ? "Review job receipts and paid expenses by business and year." : "Compare planned costs with the work and expenses recorded."}
                  </p>
                </div>
                <button className="primary" onClick={() => setCreating(true)}>
                  <Plus size={17} /> New job
                </button>
              </div>
              {view === "Overview" && (
                <>
                  <div className="metrics">
                    <Metric
                      label="OPEN LEADS"
                      value={String(
                        jobs.filter((j) => j.stage === "New lead").length,
                      )}
                      detail="Ready for a conversation"
                      Icon={BriefcaseBusiness}
                    />
                    <Metric
                      label="ACTIVE JOBS"
                      value={String(
                        jobs.filter((j) =>
                          ["Scheduled", "In progress"].includes(j.stage),
                        ).length,
                      )}
                      detail="Scheduled or in progress"
                      Icon={ClipboardList}
                    />
                    <Metric
                      label="DOCUMENT DRAFTS"
                      value={String(allDocs.length)}
                      detail="Waiting for your review"
                      Icon={Files}
                    />
                    <Metric
                      label="PAYMENTS RECORDED"
                      value={formatMoney(
                        jobs.reduce((s, j) => s + summarize(j).paid, 0),
                      )}
                      detail="Across all job records"
                      Icon={Wallet}
                    />
                  </div>
                  <div className="overview-grid">
                    <div className="overview-main">
                      {nextLead ? (
                        <section className="lead-spotlight">
                          <div className="lead-intro">
                            <span className="eyebrow">
                              <span className="pulse-dot" /> UP NEXT
                            </span>
                            <Badge tone="warm">
                              {nextLead.urgency === "ASAP"
                                ? "ASAP request"
                                : nextLead.stage}
                            </Badge>
                          </div>
                          <h2>
                            {nextLead.customer}’s {nextLead.title.toLowerCase()}
                          </h2>
                          <p>
                            <MapPin size={16} />
                            {location(nextLead) || "Location pending"}
                            <span>·</span>
                            {nextLead.windowMin !== null
                              ? `${nextLead.windowMin}${nextLead.windowMax !== null && nextLead.windowMax !== nextLead.windowMin ? `–${nextLead.windowMax}` : ""} windows`
                              : "Scope in progress"}
                          </p>
                          <div className="spotlight-bottom">
                            <div>
                              <span>NEXT STEP</span>
                              <strong>
                                {nextLead.checklist.find((c) => !c.done)
                                  ?.label || "Review the job details"}
                              </strong>
                            </div>
                            <button
                              className="light-button"
                              onClick={() => open(nextLead)}
                            >
                              Open job <ArrowUpRight size={18} />
                            </button>
                          </div>
                          <div className="ridge-art" aria-hidden="true">
                            <TreePine />
                            <TreePine />
                            <TreePine />
                          </div>
                        </section>
                      ) : (
                        <section className="panel">
                          <Empty
                            title="Your next job starts here."
                            action={
                              <button
                                className="primary"
                                onClick={() => setCreating(true)}
                              >
                                <Plus size={16} /> Add a job
                              </button>
                            }
                          >
                            Capture a customer, location, and scope to get
                            started.
                          </Empty>
                        </section>
                      )}
                      <section className="panel pipeline-panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Your job pipeline</h2>
                            <p className="muted">
                              A clear view from inquiry to completion.
                            </p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => navigate("Jobs")}
                          >
                            View all jobs <ArrowUpRight size={15} />
                          </button>
                        </div>
                        <div className="pipeline">
                          {[
                            "New lead",
                            "Site visit",
                            "Estimating",
                            "Scheduled",
                            "In progress",
                          ].map((s, i) => (
                            <div className="pipeline-stage" key={s}>
                              <div className="pipeline-title">
                                <span className={`stage-dot stage-${i}`} />
                                {s}
                                <b>
                                  {jobs.filter((j) => j.stage === s).length}
                                </b>
                              </div>
                              {jobs
                                .filter((j) => j.stage === s)
                                .map((j) => (
                                  <button
                                    className="pipeline-job"
                                    key={j.id}
                                    onClick={() => open(j)}
                                  >
                                    <strong>{j.customer}</strong>
                                    <span>{j.title}</span>
                                    <small>
                                      {j.city || "Location pending"}
                                    </small>
                                    {j.urgency === "ASAP" && (
                                      <Badge tone="amber">ASAP</Badge>
                                    )}
                                  </button>
                                ))}
                              {!jobs.some((j) => j.stage === s) && (
                                <div className="pipeline-empty">
                                  No jobs yet
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Recent job activity</h2>
                          <span className="muted small">Saved records</span>
                        </div>
                        {jobs.slice(0, 3).map((j) => (
                          <button
                            className="activity-row"
                            key={j.id}
                            onClick={() => open(j)}
                          >
                            <span className="activity-icon">
                              <BriefcaseBusiness size={18} />
                            </span>
                            <span>
                              <strong>
                                {j.customer} · {j.title}
                              </strong>
                              <small>
                                {j.stage} · Last saved{" "}
                                {dateLabel(j.updatedAt.slice(0, 10))}
                              </small>
                            </span>
                            <ArrowUpRight size={17} />
                          </button>
                        ))}
                        {!jobs.length && (
                          <p className="muted">Saved jobs will appear here.</p>
                        )}
                      </section>
                    </div>
                    <div className="overview-side">
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Coming up</h2>
                          <CalendarDays size={19} />
                        </div>
                        {events
                          .filter((e) => e.date >= today())
                          .slice(0, 3)
                          .map((e) => (
                            <button
                              key={e.id}
                              className="event-item"
                              onClick={() => open(e.job)}
                            >
                              <span className="event-date">
                                {new Date(
                                  e.date + "T12:00:00",
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                                <b>{Number(e.date.slice(8))}</b>
                              </span>
                              <span>
                                <strong>{e.title}</strong>
                                <small>
                                  {e.job.customer} · {e.time || "Time TBD"}
                                </small>
                              </span>
                            </button>
                          ))}
                        {!events.some((e) => e.date >= today()) && (
                          <div className="mini-empty">
                            <CalendarDays size={29} />
                            <strong>A little breathing room.</strong>
                            <p>No visits or jobs scheduled yet.</p>
                          </div>
                        )}
                        <button
                          className="text-button"
                          onClick={() => navigate("Calendar")}
                        >
                          Open calendar <ArrowRight size={15} />
                        </button>
                      </section>
                      <section className="panel readiness">
                        <span className="eyebrow">BEFORE YOU PRICE</span>
                        <h2>Catch the little things.</h2>
                        <p>
                          Travel, helper time, disposal, and rentals all add up.
                          Run through the job’s missed-cost checks before
                          setting a price.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            if (nextLead) {
                              open(nextLead);
                              setTab("Costs & payments");
                            } else navigate("Costs");
                          }}
                        >
                          Review cost checks <ArrowRight size={15} />
                        </button>
                      </section>
                      <section className="review-note">
                        <LockKeyhole size={21} />
                        <div>
                          <strong>Private by design.</strong>
                          <p>
                            Customer records are available after sign-in. All
                            customer documents stay drafts.
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                </>
              )}
              {view === "Jobs" && (
                <section className="panel">
                  <div className="list-toolbar">
                    <label className="search-box">
                      <Search size={18} />
                      <input
                        aria-label="Search jobs"
                        placeholder="Search customer, job, or town…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter by stage"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option>All stages</option>
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <span className="muted">
                      {filtered.length} {filtered.length === 1 ? "job" : "jobs"}
                    </span>
                  </div>
                  <div className="job-list">
                    {filtered.map((j) => (
                      <button
                        key={j.id}
                        className="job-row"
                        onClick={() => open(j)}
                      >
                        <span className="customer-initial">
                          {j.customer[0]}
                        </span>
                        <span className="job-title">
                          <strong>{j.title}</strong>
                          <small>
                            {j.customer} · {location(j)}
                          </small>
                        </span>
                        <Badge tone={j.urgency === "ASAP" ? "amber" : "green"}>
                          {j.stage}
                        </Badge>
                        <span className="job-price">
                          {formatMoney(j.quotedTotal)}
                          <small>Draft price</small>
                        </span>
                        <ArrowUpRight size={18} />
                      </button>
                    ))}
                    {!filtered.length && (
                      <Empty title="No matching jobs.">
                        Try another search or add a new job.
                      </Empty>
                    )}
                  </div>
                </section>
              )}
              {view === "Calendar" && (
                <Calendar jobs={jobs} onOpen={open} onSave={save} busy={busy} />
              )}
              {view === "Drafts" && (
                <section className="panel">
                  <div className="alert draft-alert">
                    <ShieldCheck size={20} />
                    <span>
                      All documents are drafts. Sending, customer approval, and
                      finalization are disabled.
                    </span>
                  </div>
                  {!allDocs.length ? (
                    <Empty
                      Icon={Files}
                      title="Your drafts will live here."
                      action={
                        <button
                          className="secondary"
                          onClick={() => navigate("Jobs")}
                        >
                          Open a job to create a draft
                        </button>
                      }
                    >
                      Start an estimate or customer message from a job record.
                    </Empty>
                  ) : (
                    <div className="document-list">
                      {allDocs.map(({ job: j, doc: d }) => (
                        <button
                          key={d.id}
                          onClick={() => setDocument({ jobId: j.id, id: d.id })}
                        >
                          <span className="file-icon">
                            <Files />
                          </span>
                          <span>
                            <strong>{d.title}</strong>
                            <small>
                              {j.customer} ·{" "}
                              {dateLabel(d.createdAt.slice(0, 10))}
                            </small>
                          </span>
                          <Badge tone="amber">Draft</Badge>
                          <ArrowUpRight size={17} />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {view === "Books & taxes" && <Books jobs={jobs} save={save} busy={busy} openCosts={(j) => { open(j); setTab("Costs & payments"); }} />}
              {view === "Costs" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Estimate to actual</h2>
                      <p className="muted">
                        Costs are internal. Customer prices remain drafts.
                      </p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Job</th>
                          <th>Estimated cost</th>
                          <th>Actual recorded</th>
                          <th>Variance</th>
                          <th>Draft price</th>
                          <th>Payments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j) => {
                          const s = summarize(j);
                          return (
                            <tr key={j.id}>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    open(j);
                                    setTab("Costs & payments");
                                  }}
                                >
                                  {j.customer} · {j.title}
                                </button>
                              </td>
                              <td>
                                {j.costs.length
                                  ? formatMoney(s.estimated)
                                  : "Not entered"}
                                {!s.estimatedComplete && j.costs.length > 0 && (
                                  <small>Partial</small>
                                )}
                              </td>
                              <td>
                                {j.costs.some((c) => c.actualRate !== null)
                                  ? formatMoney(s.actual)
                                  : "Not entered"}
                                {!s.actualComplete &&
                                  j.costs.some(
                                    (c) => c.actualRate !== null,
                                  ) && <small>Partial</small>}
                              </td>
                              <td>
                                {s.variance === null
                                  ? "Pending"
                                  : formatMoney(s.variance)}
                              </td>
                              <td>{formatMoney(j.quotedTotal)}</td>
                              <td>{formatMoney(s.paid)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!jobs.length && (
                    <Empty title="Start with a job.">
                      Track materials, labor, travel, rentals, and payments in
                      each record.
                    </Empty>
                  )}
                </section>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <TreePine size={14} /> Maple Ridge Home & Property Solutions LLC
            </span>
            <a href="/api/export" download>
              <Download size={14} /> Download private backup
            </a>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}
      {creating && (
        <Modal title="Create a job" onClose={() => setCreating(false)}>
          <form
            className="modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const j = {
                ...newJob(String(f.get("customer"))),
                title: String(f.get("title")),
                city: String(f.get("city")),
                urgency: String(f.get("urgency")) as Job["urgency"],
                scope: String(f.get("scope")),
              };
              const saved = await save(j, true);
              if (saved) {
                setCreating(false);
                setTab("Details");
              }
            }}
          >
            <div className="form-grid">
              <Field label="Customer name">
                <input name="customer" autoFocus required maxLength={200} />
              </Field>
              <Field label="Job title">
                <input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="Window replacement"
                />
              </Field>
              <Field label="Town">
                <input name="city" maxLength={120} />
              </Field>
              <Field label="Timing">
                <select name="urgency">
                  <option>Normal</option>
                  <option>ASAP</option>
                  <option>Flexible</option>
                </select>
              </Field>
              <Field label="Requested work" wide>
                <textarea name="scope" rows={4} />
              </Field>
            </div>
            <p className="small-note">
              You can add measurements, costs, photos, and more after creating
              the record.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button disabled={busy} className="primary">
                {busy ? "Creating…" : "Create job"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {document && selectedDoc && (
        <DocumentModal
          doc={selectedDoc}
          onClose={() => setDocument(null)}
          busy={busy}
          onSave={async (changes) => {
            const current =
              job?.id === document.jobId
                ? job
                : jobs.find((j) => j.id === document.jobId);
            if (!current) return false;
            const updated = {
              ...current,
              documents: current.documents.map((d) =>
                d.id === document.id
                  ? { ...d, ...changes, status: "draft" as const }
                  : d,
              ),
            };
            if (job?.id === current.id) setJob(updated);
            return !!(await save(updated));
          }}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: typeof BriefcaseBusiness;
}) {
  return (
    <section className="metric">
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}

function Details({
  job,
  patch,
}: {
  job: Job;
  patch: (v: Partial<Job>) => void;
}) {
  const [measurement, setMeasurement] = useState(false);
  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Customer & property</h2>
        </div>
        <div className="form-grid">
          <Field label="Customer name">
            <input
              value={job.customer}
              onChange={(e) => patch({ customer: e.target.value })}
              required
              maxLength={200}
            />
          </Field>
          <Field label="Job title">
            <input
              value={job.title}
              onChange={(e) => patch({ title: e.target.value })}
              required
              maxLength={200}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={job.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={job.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </Field>
          <Field label="Property address" wide>
            <input
              value={job.address}
              onChange={(e) => patch({ address: e.target.value })}
              placeholder="To be confirmed"
            />
          </Field>
          <Field label="Town">
            <input
              value={job.city}
              onChange={(e) => patch({ city: e.target.value })}
            />
          </Field>
          <Field label="State & ZIP">
            <div className="inline-inputs">
              <input
                aria-label="State"
                value={job.state}
                onChange={(e) => patch({ state: e.target.value })}
              />
              <input
                aria-label="ZIP code"
                value={job.zip}
                onChange={(e) => patch({ zip: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Requested timing">
            <select
              value={job.urgency}
              onChange={(e) =>
                patch({ urgency: e.target.value as Job["urgency"] })
              }
            >
              <option>ASAP</option>
              <option>Normal</option>
              <option>Flexible</option>
            </select>
          </Field>
          <Field label="Stage">
            <select
              value={job.stage}
              onChange={(e) => patch({ stage: e.target.value as Job["stage"] })}
            >
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Scope of work" wide>
            <textarea
              rows={5}
              value={job.scope}
              onChange={(e) => patch({ scope: e.target.value })}
            />
          </Field>
        </div>
        <hr />
        <div className="panel-heading">
          <h2>Window details</h2>
        </div>
        <div className="form-grid">
          <Field label="Minimum window count">
            <input
              type="number"
              min={0}
              max={999}
              value={job.windowMin ?? ""}
              onChange={(e) =>
                patch({
                  windowMin:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Maximum window count">
            <input
              type="number"
              min={0}
              max={999}
              value={job.windowMax ?? ""}
              onChange={(e) =>
                patch({
                  windowMax:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Window type & supply" wide>
            <input
              value={job.windowType}
              onChange={(e) => patch({ windowType: e.target.value })}
              placeholder="Style, material, and who supplies the windows"
            />
          </Field>
          <Field label="Floor, access & site conditions" wide>
            <textarea
              rows={3}
              value={job.access}
              onChange={(e) => patch({ access: e.target.value })}
              placeholder="Floor, ladders/lift, trim, possible rot…"
            />
          </Field>
        </div>
      </section>
      <section className="panel fit-content">
        <div className="panel-heading">
          <h2>Measurements</h2>
          <button className="text-button" onClick={() => setMeasurement(true)}>
            <Plus size={16} /> Add
          </button>
        </div>
        <p className="small-note">
          Record opening measurements in inches. Verify the manufacturer’s
          required order dimensions separately.
        </p>
        {!job.measurements.length ? (
          <Empty title="Measure before you order.">
            Add one record for each opening after the site visit.
          </Empty>
        ) : (
          job.measurements.map((m) => (
            <div className="measurement" key={m.id}>
              <div>
                <strong>{m.location}</strong>
                <span>
                  {m.width ?? "?"}″ W × {m.height ?? "?"}″ H
                </span>
                <p>{m.notes}</p>
              </div>
              <button
                className="icon-button"
                aria-label={`Remove ${m.location} measurement`}
                onClick={() =>
                  patch({
                    measurements: job.measurements.filter((x) => x.id !== m.id),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
        {measurement && (
          <Modal
            title="Add opening measurement"
            onClose={() => setMeasurement(false)}
          >
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                patch({
                  measurements: [
                    ...job.measurements,
                    {
                      id: uid(),
                      location: String(f.get("location")),
                      width: inputNumber(f.get("width")),
                      height: inputNumber(f.get("height")),
                      notes: String(f.get("notes")),
                    },
                  ],
                });
                setMeasurement(false);
              }}
            >
              <div className="form-grid">
                <Field label="Opening / room" wide>
                  <input
                    name="location"
                    required
                    placeholder="Kitchen, left window"
                  />
                </Field>
                <Field label="Width (inches)">
                  <input
                    name="width"
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.001"
                  />
                </Field>
                <Field label="Height (inches)">
                  <input
                    name="height"
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.001"
                  />
                </Field>
                <Field label="Measurement notes" wide>
                  <textarea
                    name="notes"
                    placeholder="Rough opening vs. frame, trim, condition…"
                  />
                </Field>
              </div>
              <div className="modal-actions">
                <button className="primary">Add measurement</button>
              </div>
            </form>
          </Modal>
        )}
      </section>
    </div>
  );
}

function Checklist({
  job,
  patch,
}: {
  job: Job;
  patch: (v: Partial<Job>) => void;
}) {
  const [label, setLabel] = useState("");
  const done = job.checklist.filter((c) => c.done).length;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Job checklist</h2>
          <p className="muted">
            {done} of {job.checklist.length} complete
          </p>
        </div>
        <CheckCheck size={22} />
      </div>
      <div className="progress-track">
        <div
          style={{
            width: `${job.checklist.length ? (done / job.checklist.length) * 100 : 0}%`,
          }}
        />
      </div>
      {job.checklist.map((c) => (
        <div className="check-row" key={c.id}>
          <label>
            <input
              type="checkbox"
              checked={c.done}
              onChange={(e) =>
                patch({
                  checklist: job.checklist.map((x) =>
                    x.id === c.id ? { ...x, done: e.target.checked } : x,
                  ),
                })
              }
            />
            <span className={c.done ? "completed" : ""}>{c.label}</span>
          </label>
          <button
            className="icon-button"
            aria-label={`Remove ${c.label}`}
            onClick={() =>
              patch({ checklist: job.checklist.filter((x) => x.id !== c.id) })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <form
        className="add-line"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          patch({
            checklist: [
              ...job.checklist,
              { id: uid(), label: label.trim(), done: false },
            ],
          });
          setLabel("");
        }}
      >
        <input
          aria-label="New checklist item"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a step to remember…"
          maxLength={500}
          required
        />
        <button className="secondary">
          <Plus size={16} /> Add step
        </button>
      </form>
    </section>
  );
}

function Costs({ job, patch }: { job: Job; patch: (v: Partial<Job>) => void }) {
  const [cost, setCost] = useState<Cost | null>(null),
    [payment, setPayment] = useState(false);
  const s = summarize(job);
  return (
    <>
      <div className="metrics three">
        <Metric
          label="ESTIMATED COST"
          value={job.costs.length ? formatMoney(s.estimated) : "Not entered"}
          detail={
            s.estimatedComplete
              ? "All line items priced"
              : "Incomplete · review missing costs"
          }
          Icon={ClipboardList}
        />
        <Metric
          label="ACTUAL RECORDED"
          value={
            job.costs.some((c) => c.actualRate !== null)
              ? formatMoney(s.actual)
              : "Not entered"
          }
          detail={
            s.actualComplete
              ? "All line items recorded"
              : "Record expenses and hours as you go"
          }
          Icon={ChartNoAxesCombined}
        />
        <Metric
          label="COST VARIANCE"
          value={s.variance === null ? "Pending" : formatMoney(s.variance)}
          detail="Actual minus estimate · positive is over"
          Icon={Wallet}
        />
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Cost worksheet</h2>
                <p className="muted">
                  Use hours for labor, miles or hours for travel, and units for
                  materials.
                </p>
              </div>
              <button
                className="secondary"
                onClick={() =>
                  setCost({
                    id: uid(),
                    category: "Materials",
                    description: "",
                    unit: "each",
                    estimatedQty: null,
                    actualQty: null,
                    estimatedRate: null,
                    actualRate: null,
                  })
                }
              >
                <Plus size={16} /> Add cost
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Estimated</th>
                    <th>Actual</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {job.costs.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => setCost(c)}
                        >
                          {c.description || c.category}
                        </button>
                        <small>
                          {c.category} · {c.unit}
                        </small>
                      </td>
                      <td>
                        {formatMoney(
                          lineTotal(c.estimatedQty, c.estimatedRate),
                        )}
                        <small>
                          {c.estimatedQty ?? "—"} ×{" "}
                          {formatMoney(c.estimatedRate)}
                        </small>
                      </td>
                      <td>
                        {formatMoney(lineTotal(c.actualQty, c.actualRate))}
                        <small>
                          {c.actualQty ?? "—"} × {formatMoney(c.actualRate)}
                        </small>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${c.description || c.category}`}
                          onClick={() =>
                            patch({
                              costs: job.costs.filter((x) => x.id !== c.id),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!job.costs.length && (
              <Empty title="Start with the cost of the work.">
                Add materials, owner and helper hours, travel, rentals, and
                disposal.
              </Empty>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Payments received</h2>
                <p className="muted">
                  Record money actually received. This does not send an invoice
                  or charge a customer.
                </p>
              </div>
              <button className="secondary" onClick={() => setPayment(true)}>
                <Plus size={16} /> Record payment
              </button>
            </div>
            {job.payments.length ? (
              job.payments.map((p) => (
                <div className="payment-row" key={p.id}>
                  <span className="activity-icon">
                    <Wallet size={18} />
                  </span>
                  <span>
                    <strong>
                      {p.kind} · {formatMoney(p.amount)}
                    </strong>
                    <small>
                      {dateLabel(p.date)} · {p.method || "Method not entered"}
                    </small>
                    <small>{p.notes}</small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p.kind} payment`}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this payment entry? No money will move.",
                        )
                      )
                        patch({
                          payments: job.payments.filter((x) => x.id !== p.id),
                        });
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">No payments recorded.</p>
            )}
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Draft customer price</h2>
            <p className="muted">
              Enter your proposed total separately from internal costs. Confirm
              tax treatment and inclusions before customer review.
            </p>
            <label>
              Proposed total ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={dollars(job.quotedTotal)}
                onChange={(e) =>
                  patch({
                    quotedTotal:
                      e.target.value === ""
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
                placeholder="Not priced"
              />
            </label>
            <dl className="money-list">
              <div>
                <dt>Planned margin*</dt>
                <dd>
                  {s.plannedMargin === null
                    ? "Pending"
                    : formatMoney(s.plannedMargin)}
                </dd>
              </div>
              <div>
                <dt>Payments received</dt>
                <dd>{formatMoney(s.paid)}</dd>
              </div>
              <div>
                <dt>Draft price less payments</dt>
                <dd>
                  {s.unallocated === null
                    ? "Pending"
                    : formatMoney(s.unallocated)}
                </dd>
              </div>
            </dl>
            <p className="small-note">
              *Draft price less estimated costs, before any unrecorded overhead
              or taxes. This is not an amount due.
            </p>
          </section>
          <section className="panel cost-checks">
            <div className="panel-heading">
              <h2>Missed-cost checks</h2>
              <AlertCircle size={19} />
            </div>
            {missedCosts(job).map((w) => (
              <div className="warning-row" key={w}>
                <span />
                <p>{w}</p>
              </div>
            ))}
            {!missedCosts(job).length && (
              <p>
                <CheckCircle2 size={18} /> Main cost inputs are filled. Review
                the scope before using a price.
              </p>
            )}
            <p className="small-note">
              Also review trim, flashing, fasteners, disposal, hidden rot, and
              any permit requirements.
            </p>
          </section>
        </div>
      </div>
      {cost && (
        <Modal
          title={
            job.costs.some((x) => x.id === cost.id)
              ? "Edit cost item"
              : "Add cost item"
          }
          onClose={() => setCost(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const c: Cost = {
                ...cost,
                paidOn: String(f.get("paidOn") || "") || undefined,
                category: String(f.get("category")) as Cost["category"],
                description: String(f.get("description")),
                unit: String(f.get("unit")),
                estimatedQty: inputNumber(f.get("estimatedQty")),
                estimatedRate: inputMoney(f.get("estimatedRate")),
                actualQty: inputNumber(f.get("actualQty")),
                actualRate: inputMoney(f.get("actualRate")),
              };
              patch({
                costs: job.costs.some((x) => x.id === c.id)
                  ? job.costs.map((x) => (x.id === c.id ? c : x))
                  : [...job.costs, c],
              });
              setCost(null);
            }}
          >
            <div className="form-grid">
              <Field label="Category">
                <select name="category" defaultValue={cost.category}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit">
                <select name="unit" defaultValue={cost.unit}>
                  {[
                    "each",
                    "hours",
                    "miles",
                    "days",
                    "flat fee",
                    "sq ft",
                    "linear ft",
                  ].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description" wide>
                <input
                  name="description"
                  defaultValue={cost.description}
                  required
                  placeholder="Window units, installation time, dump fee…"
                />
              </Field>
              <Field label="Estimated quantity">
                <input
                  name="estimatedQty"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  defaultValue={cost.estimatedQty ?? ""}
                />
              </Field>
              <Field label="Estimated unit cost ($)">
                <input
                  name="estimatedRate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={dollars(cost.estimatedRate)}
                />
              </Field>
              <Field label="Date paid (for books)">
                <input type="date" name="paidOn" defaultValue={cost.paidOn ?? ""} />
              </Field>
              <Field label="Actual quantity">
                <input
                  name="actualQty"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  defaultValue={cost.actualQty ?? ""}
                />
              </Field>
              <Field label="Actual unit cost ($)">
                <input
                  name="actualRate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={dollars(cost.actualRate)}
                />
              </Field>
            </div>
            <p className="small-note">
              Leave unknown amounts blank. Enter zero only when you’ve confirmed
              there is no cost.
            </p>
            <div className="modal-actions">
              <button className="primary">Use cost item</button>
            </div>
          </form>
        </Modal>
      )}
      {payment && (
        <Modal
          title="Record a payment received"
          onClose={() => setPayment(false)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              patch({
                payments: [
                  ...job.payments,
                  {
                    id: uid(),
                    date: String(f.get("date")),
                    amount: inputMoney(f.get("amount"))!,
                    kind: String(f.get("kind")) as
                      | "Deposit"
                      | "Progress"
                      | "Final",
                    method: String(f.get("method")),
                    notes: String(f.get("notes")),
                  },
                ],
              });
              setPayment(false);
            }}
          >
            <div className="form-grid">
              <Field label="Amount received ($)">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </Field>
              <Field label="Date received">
                <input
                  name="date"
                  type="date"
                  defaultValue={today()}
                  required
                />
              </Field>
              <Field label="Payment type">
                <select name="kind">
                  <option>Deposit</option>
                  <option>Progress</option>
                  <option>Final</option>
                </select>
              </Field>
              <Field label="Method / reference">
                <input
                  name="method"
                  placeholder="Check, cash, bank transfer…"
                />
              </Field>
              <Field label="Notes" wide>
                <textarea name="notes" />
              </Field>
            </div>
            <div className="modal-actions">
              <button className="primary">Add payment record</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Photos({
  job,
  onError,
  onNotice,
}: {
  job: Job;
  onError: (s: string) => void;
  onNotice: (s: string) => void;
}) {
  const [photos, setPhotos] = useState<Attachment[]>([]),
    [loading, setLoading] = useState(true),
    [uploading, setUploading] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ photos: Attachment[] }>(`/api/jobs/${job.id}/photos`)
      .then((d) => {
        if (active) setPhotos(d.photos);
      })
      .catch((e) => onError(e.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [job.id, onError]);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Site photos</h2>
          <p className="muted">
            Private, saved photos for this job. JPEG, PNG, or WebP, up to 3 MB
            each.
          </p>
        </div>
        <label className="secondary upload-button">
          <Camera size={17} />
          {uploading ? "Uploading…" : "Add photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              const input = e.currentTarget;
              setUploading(true);
              let count = 0;
              for (const file of files) {
                try {
                  if (file.size > 3 * 1024 * 1024)
                    throw new Error(
                      `${file.name} is over 3 MB. Choose a smaller photo.`,
                    );
                  const data = await api<{ photo: Attachment }>(
                    `/api/jobs/${job.id}/photos`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": file.type,
                        "X-File-Name": encodeURIComponent(file.name),
                      },
                      body: file,
                    },
                  );
                  setPhotos((p) => [data.photo, ...p]);
                  count++;
                } catch (e) {
                  onError((e as Error).message);
                }
              }
              setUploading(false);
              input.value = "";
              if (count)
                onNotice(
                  `${count} ${count === 1 ? "photo" : "photos"} saved privately.`,
                );
            }}
          />
        </label>
      </div>
      {loading ? (
        <p>Loading photos…</p>
      ) : photos.length ? (
        <div className="photo-grid">
          {photos.map((p) => (
            <a
              key={p.id}
              href={`/api/photos/${p.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img src={`/api/photos/${p.id}`} alt={p.name} />
              <span>
                <Paperclip size={14} />
                {p.name}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <Empty Icon={Camera} title="Bring the site into focus.">
          Add photos of each opening, trim, access, and any damage. Uploaded
          photos save immediately.
        </Empty>
      )}
    </section>
  );
}

function Calendar({
  jobs,
  onOpen,
  onSave,
  busy,
}: {
  jobs: Job[];
  onOpen: (j: Job) => void;
  onSave: (j: Job) => Promise<Job | null>;
  busy: boolean;
}) {
  const [month, setMonth] = useState(() => today().slice(0, 7)),
    [event, setEvent] = useState<{
      jobId: string;
      eventId?: string;
      date: string;
    } | null>(null);
  const [year, monthNumber] = month.split("-").map(Number),
    start = new Date(year, monthNumber - 1, 1).getDay(),
    days = new Date(year, monthNumber, 0).getDate();
  const events = jobs.flatMap((j) => j.events.map((e) => ({ ...e, job: j })));
  const existing = event?.eventId
    ? events.find((e) => e.id === event.eventId)
    : undefined;
  function changeMonth(delta: number) {
    const d = new Date(year, monthNumber - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <section className="panel">
      <div className="panel-heading">
        <div className="calendar-title">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft />
          </button>
          <h2>
            {new Date(year, monthNumber - 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="heading-actions">
          <button
            className="text-button"
            onClick={() => setMonth(today().slice(0, 7))}
          >
            Today
          </button>
          <button
            className="primary"
            disabled={!jobs.length}
            onClick={() =>
              setEvent({ jobId: jobs[0]?.id || "", date: today() })
            }
          >
            <Plus size={16} /> Add event
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div className="day-label" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <div className="calendar-cell muted-cell" key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          return (
            <div
              className={`calendar-cell ${date === today() ? "is-today" : ""}`}
              key={date}
            >
              <button
                className="day-number"
                aria-label={`Add event on ${dateLabel(date)}`}
                disabled={!jobs.length}
                onClick={() => setEvent({ jobId: jobs[0]?.id || "", date })}
              >
                {i + 1}
              </button>
              {events
                .filter((e) => e.date === date)
                .map((e) => (
                  <button
                    className="calendar-event"
                    key={e.id}
                    onClick={() =>
                      setEvent({ jobId: e.job.id, eventId: e.id, date: e.date })
                    }
                  >
                    <span>{e.time}</span>
                    <strong>{e.title}</strong>
                    <small>{e.job.customer}</small>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <div className="agenda">
        <h3>Scheduled this month</h3>
        {events
          .filter((e) => e.date.startsWith(month))
          .sort((a, b) =>
            `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
          )
          .map((e) => (
            <div className="event-item" key={e.id}>
              <span className="event-date">
                {e.date.slice(5, 7)} /<b>{e.date.slice(8)}</b>
              </span>
              <button className="text-button" onClick={() => onOpen(e.job)}>
                {e.title} · {e.job.customer}
              </button>
              <small>{e.time || "Time TBD"}</small>
            </div>
          ))}
        {!events.some((e) => e.date.startsWith(month)) && (
          <p className="muted">
            Nothing scheduled. Add a visit or work day when the date is
            confirmed.
          </p>
        )}
      </div>
      {event && (
        <Modal
          title={existing ? "Edit scheduled event" : "Add a scheduled event"}
          onClose={() => setEvent(null)}
        >
          <form
            className="modal-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const j = jobs.find((j) => j.id === String(f.get("jobId")))!;
              const entry = {
                id: existing?.id || uid(),
                date: String(f.get("date")),
                time: String(f.get("time")),
                title: String(f.get("title")),
                notes: String(f.get("notes")),
              };
              if (
                await onSave({
                  ...j,
                  events: existing
                    ? j.events.map((x) => (x.id === entry.id ? entry : x))
                    : [...j.events, entry],
                })
              )
                setEvent(null);
            }}
          >
            <div className="form-grid">
              <Field label="Job" wide>
                <select
                  name="jobId"
                  defaultValue={event.jobId}
                  disabled={!!existing}
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.customer} · {j.title}
                    </option>
                  ))}
                </select>
                {existing && (
                  <input type="hidden" name="jobId" value={event.jobId} />
                )}
              </Field>
              <Field label="Event title" wide>
                <input
                  name="title"
                  required
                  defaultValue={existing?.title}
                  placeholder="Site visit, installation, follow-up…"
                />
              </Field>
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  defaultValue={event.date}
                  required
                />
              </Field>
              <Field label="Time (Eastern)">
                <input name="time" type="time" defaultValue={existing?.time} />
              </Field>
              <Field label="Notes" wide>
                <textarea name="notes" defaultValue={existing?.notes} />
              </Field>
            </div>
            <div className="modal-actions">
              {existing && (
                <button
                  type="button"
                  className="danger-button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Remove this scheduled event?")) return;
                    const j = jobs.find((j) => j.id === event.jobId)!;
                    if (
                      await onSave({
                        ...j,
                        events: j.events.filter((x) => x.id !== existing.id),
                      })
                    )
                      setEvent(null);
                  }}
                >
                  Remove event
                </button>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save event"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function DocumentModal({
  doc,
  onClose,
  onSave,
  busy,
}: {
  doc: DraftDocument;
  onClose: () => void;
  onSave: (d: Partial<DraftDocument>) => Promise<boolean>;
  busy: boolean;
}) {
  const [title, setTitle] = useState(doc.title),
    [body, setBody] = useState(doc.body),
    [total, setTotal] = useState(dollars(doc.quotedTotal)),
    [editing, setEditing] = useState(false),
    [localError, setLocalError] = useState("");
  const changed =
    title !== doc.title ||
    body !== doc.body ||
    total !== dollars(doc.quotedTotal);
  return (
    <Modal
      title={`${doc.kind} draft`}
      wide
      onClose={() => {
        if (!changed || window.confirm("Discard unsaved document changes?"))
          onClose();
      }}
    >
      <div className="doc-toolbar no-print">
        <Badge tone="amber">DRAFT · NOT APPROVED</Badge>
        <div>
          <button className="secondary" onClick={() => setEditing(!editing)}>
            {editing ? "Preview draft" : "Edit draft"}
          </button>
          <button
            className="secondary"
            disabled={changed}
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print draft
          </button>
        </div>
      </div>
      {localError && (
        <p className="error" role="alert">
          {localError}
        </p>
      )}
      {editing ? (
        <form
          className="modal-form no-print"
          onSubmit={async (e) => {
            e.preventDefault();
            setLocalError("");
            const ok = await onSave({
              title,
              body,
              quotedTotal:
                total === "" ? null : Math.round(Number(total) * 100),
            });
            if (ok) setEditing(false);
            else
              setLocalError(
                "Unable to save this draft. Close the preview to see the error. Your changes remain here.",
              );
          }}
        >
          <label>
            Title
            <input
              value={title}
              required
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Draft content
            <textarea
              rows={12}
              value={body}
              maxLength={20000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {doc.kind !== "Customer message" && (
            <label>
              Draft total ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </label>
          )}
          <div className="modal-actions">
            <button className="primary" disabled={busy || !changed}>
              <Save size={16} /> {busy ? "Saving…" : "Save draft"}
            </button>
          </div>
        </form>
      ) : (
        <article className="document-paper">
          <div className="print-watermark">DRAFT · NOT APPROVED</div>
          <header>
            <div className="document-brand">
              <TreePine size={34} />
              <strong>
                Maple Ridge<small>Home & Property Solutions LLC</small>
              </strong>
            </div>
            <Badge tone="amber">DRAFT</Badge>
          </header>
          <div className="document-meta">
            <span>{doc.kind.toUpperCase()} · FOR OWNER REVIEW</span>
            <span>{dateLabel(doc.createdAt.slice(0, 10))}</span>
          </div>
          <h1>{title}</h1>
          <div className="document-customer">
            <span>PREPARED FOR</span>
            <strong>{doc.customer}</strong>
            <p>{doc.location || "Property address to be confirmed"}</p>
          </div>
          <div className="document-body">{body}</div>
          {doc.kind !== "Customer message" && (
            <div className="document-total">
              <span>Draft proposed total</span>
              <strong>
                {formatMoney(
                  total === "" ? null : Math.round(Number(total) * 100),
                )}
              </strong>
            </div>
          )}
          <footer>
            <strong>DRAFT — NOT APPROVED OR SENT</strong>
            <p>
              {doc.kind === "Invoice"
                ? "This is an invoice draft, not a payment request."
                : doc.kind === "Change order"
                  ? "No scope change, price, or schedule adjustment is authorized by this draft."
                  : "Scope, pricing, timing, and terms remain subject to review."}{" "}
              Owner approval is required before customer use.
            </p>
          </footer>
        </article>
      )}
      <div className="modal-actions no-print">
        <button
          className="secondary"
          onClick={() => {
            if (!changed || window.confirm("Discard unsaved document changes?"))
              onClose();
          }}
        >
          Close draft
        </button>
      </div>
    </Modal>
  );
}
