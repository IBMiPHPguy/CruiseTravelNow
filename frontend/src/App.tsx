import { FormEvent, useEffect, useState } from "react";
import { createRequest, fetchDashboard, fetchHealth } from "./api";
import { fetchCurrentUser, logout } from "./authApi";
import { getToken } from "./authStorage";
import Dashboard from "./Dashboard";
import Login from "./Login";
import RequestForm, { emptyRequestForm, isReturnAfterDeparture } from "./RequestForm";
import RequestWorkspace from "./RequestWorkspace";
import type { AppView, DashboardData, TravelRequestInput, User } from "./types";
import "./App.css";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<AppView>({ type: "dashboard" });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [form, setForm] = useState<TravelRequestInput>(emptyRequestForm);
  const [health, setHealth] = useState<string>("checking...");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  async function loadDashboard() {
    setDashboardLoading(true);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
        await loadDashboard();
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    bootstrap().catch(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetchHealth()
      .then((result) => setHealth(`${result.service} (${result.status})`))
      .catch(() => setHealth("offline"));
  }, [currentUser]);

  function handleLogout() {
    logout();
    setCurrentUser(null);
    setDashboard(null);
    setView({ type: "dashboard" });
    setMessage("");
    setError("");
  }

  function handleAuthenticated(user: User) {
    setCurrentUser(user);
    setView({ type: "dashboard" });
    setError("");
    loadDashboard().catch(() => setError("Unable to load dashboard."));
    fetchHealth()
      .then((result) => setHealth(`${result.service} (${result.status})`))
      .catch(() => setHealth("offline"));
  }

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    if (form.cabin_types.length === 0) {
      setError("Select at least one cabin type.");
      setSubmitting(false);
      return;
    }

    if (!isReturnAfterDeparture(form.departure_date, form.return_date)) {
      setError("Return date must be after the departure date.");
      setSubmitting(false);
      return;
    }

    const payload: TravelRequestInput = {
      ...form,
      excluded_cruise_line: form.excluded_cruise_line?.trim() || undefined,
      destination_details: ["Caribbean", "Alaska", "Asia", "Europe"].includes(form.destination)
        ? form.destination_details
        : null,
      first_passenger_date_of_birth: form.first_passenger_date_of_birth?.trim() || undefined,
    };

    try {
      const created = await createRequest(payload);
      setForm(emptyRequestForm);
      setMessage("Travel request created.");
      await loadDashboard();
      setView({ type: "edit", requestId: created.id });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="page auth-page">
        <section className="card auth-card">
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-top">
          <div>
            <h1>CruiseTravelNow</h1>
            <p>Manage cruise travel requests from intake through close.</p>
            <p>API status: {health}</p>
          </div>
          <div className="user-panel">
            <span>Signed in as {currentUser.username}</span>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </section>

      {view.type === "dashboard" ? (
        dashboardLoading && !dashboard ? (
          <section className="card">
            <p>Loading dashboard...</p>
          </section>
        ) : dashboard ? (
          <Dashboard
            dashboard={dashboard}
            onNewRequest={() => {
              setForm(emptyRequestForm);
              setMessage("");
              setError("");
              setView({ type: "new" });
            }}
            onOpenRequest={(requestId) => {
              setMessage("");
              setError("");
              setView({ type: "edit", requestId });
            }}
          />
        ) : (
          <section className="card">
            <p>{error || "Unable to load dashboard."}</p>
          </section>
        )
      ) : null}

      {view.type === "new" ? (
        <section className="card">
          <div className="workspace-header">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setView({ type: "dashboard" });
                loadDashboard().catch(() => undefined);
              }}
            >
              Back to dashboard
            </button>
            <h2>New Cruise Request</h2>
          </div>
          <RequestForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreateRequest}
            submitting={submitting}
            submitLabel="Create Request"
            showPrimaryPassengerDob
          />
          {message ? <p className="status success">{message}</p> : null}
          {error ? <p className="status error">{error}</p> : null}
        </section>
      ) : null}

      {view.type === "edit" ? (
        <RequestWorkspace
          requestId={view.requestId}
          onBack={() => {
            setView({ type: "dashboard" });
            loadDashboard().catch(() => undefined);
          }}
          onClosed={() => {
            setView({ type: "dashboard" });
            loadDashboard().catch(() => undefined);
          }}
        />
      ) : null}
    </main>
  );
}

export default App;
