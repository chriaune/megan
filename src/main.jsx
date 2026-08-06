import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Phone,
  Plus,
  Send,
} from "lucide-react";
import "./styles.css";
import banner from "./assets/header-banner.png";
import logo from "./assets/magna-logo.png";
import avatar from "./assets/megan-avatar.png";
import { event, currentConferenceDate, days } from "./data/event.js";
import { bingoFacts, wifi } from "./data/misc.js";
import {
  sessionsService,
  vendorsService,
  attendeeService,
  connectionsService,
  chatService,
  serviceConfig,
} from "./services/index.js";
const initials = (n) =>
    n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .slice(0, 2),
  dt = (d, t) => new Date(`${d}T${t}:00`),
  now = () => new Date(event.current),
  state = (s) =>
    now() >= dt(s.date, s.start) && now() < dt(s.date, s.end)
      ? "NOW"
      : now() >= dt(s.date, s.end)
        ? "DONE"
        : "NEXT";
function PCard({ p, sub, onConnect, action = "Connect" }) {
  return (
    <div className="person">
      <i>{initials(p.name)}</i>
      <div>
        <b>{p.name}</b>
        <span>{sub}</span>
      </div>
      {action && <button onClick={() => onConnect?.(p)}>{action}</button>}
    </div>
  );
}
function Session({ s, my }) {
  return (
    <div className={`session ${my ? state(s).toLowerCase() : ""}`}>
      <b>{s.start}</b>
      <div>
        <strong>{s.title}</strong>
        <span>{s.room}</span>
        {my && (
          <em>
            {state(s) === "NOW"
              ? "📍 You are here"
              : s.kind === "mandatory"
                ? "Event mandatory · LOCKED"
                : s.kind === "speaker"
                  ? "Speaker · LOCKED"
                  : "Selected · Editable"}
          </em>
        )}
      </div>
    </div>
  );
}
function Register({ complete }) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [company, setCompany] = useState(""),
    [attendance, setAttendance] = useState("Onsite"),
    [facts, setFacts] = useState([0, 1, 2]);
  return (
    <div className="card">
      <h4>Register for MEGAN</h4>
      <input
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <select
        value={attendance}
        onChange={(e) => setAttendance(e.target.value)}
      >
        <option>Onsite</option>
        <option>Virtual</option>
      </select>
      <p>Select exactly 3 predefined Bingo facts.</p>
      {bingoFacts.map((x, i) => (
        <label key={x}>
          <input
            type="checkbox"
            checked={facts.includes(i)}
            onChange={() =>
              setFacts((v) =>
                v.includes(i)
                  ? v.filter((n) => n !== i)
                  : v.length < 3
                    ? [...v, i]
                    : v,
              )
            }
          />
          {x}
        </label>
      ))}
      <button
        className="red"
        disabled={!email || facts.length !== 3}
        onClick={() =>
          complete({
            name,
            email,
            company,
            attendance,
            bingoFacts: facts.map((i) => bingoFacts[i]),
          })
        }
      >
        Simulate magic link verification
      </button>
    </div>
  );
}
function Badge({ u }) {
  return (
    <div className="badge">
      <div>
        <strong>{u.name}</strong>
        <span>{u.company}</span>
        <span>{u.attendance}</span>
        <em>{u.role}</em>
      </div>
      <div className="qr">
        {Array.from({ length: 64 }).map((_, i) => (
          <span className={i % 3 === 0 || i % 7 === 0 ? "on" : ""} key={i} />
        ))}
      </div>
    </div>
  );
}
function Connect({ p, cmd }) {
  return (
    <div className="connect-options">
      <h4>Connect with {p.name}</h4>
      <p>
        {p.company} · {p.attendance}
      </p>
      <button
        disabled={p.attendance !== "Onsite"}
        onClick={() => cmd(`meet ${p.name} onsite`)}
      >
        <MapPin />
        <span>
          <b>On-site meeting</b>
          <em>Suggest a meeting point</em>
        </span>
      </button>
      <button onClick={() => cmd(`quick chat with ${p.name}`)}>
        <MessageCircle />
        <span>
          <b>Quick chat</b>
          <em>Start a MEGAN chat</em>
        </span>
      </button>
      <button onClick={() => cmd(`show email for ${p.name}`)}>
        <Mail />
        <span>
          <b>Email</b>
          <em>Show verified email</em>
        </span>
      </button>
      <button onClick={() => cmd(`show phone for ${p.name}`)}>
        <Phone />
        <span>
          <b>Phone number</b>
          <em>Show shared phone</em>
        </span>
      </button>
    </div>
  );
}
function Content({
  m,
  cmd,
  u,
  people,
  sessions,
  day,
  setDay,
  register,
  connect,
  connections,
  vendors,
}) {
  const byId = (id) => people.find((x) => x.id === id);
  if (m.type === "text") return <p>{m.text}</p>;
  if (m.type === "welcome")
    return (
      <>
        <p>
          <b>Hi {u?.name.split(" ")[0] || "there"}! 👋</b>
        </p>
        <p>
          Welcome to <b>{event.shortName}</b>.
        </p>
        <p>
          Data mode: <b>{serviceConfig.mode}</b>
        </p>
      </>
    );
  if (m.type === "register") return <Register complete={register} />;
  if (m.type === "agenda")
    return (
      <div>
        <h4>Agenda</h4>
        {sessions
          .filter((x) => x.date === day)
          .map((x) => (
            <Session key={x.id} s={x} />
          ))}
      </div>
    );
  if (m.type === "myday")
    return (
      <div>
        <h4>My Day</h4>
        <div className="days">
          {days.map((x) => (
            <button
              key={x.date}
              className={x.date === day ? "active" : ""}
              onClick={() => setDay(x.date)}
            >
              {x.label.split(" · ")[0]}
            </button>
          ))}
        </div>
        {sessions
          .filter((x) => x.date === day)
          .map((x) => (
            <Session key={x.id} s={x} my />
          ))}
      </div>
    );
  if (m.type === "badge") return <Badge u={u} />;
  if (m.type === "bingo")
    return (
      <div>
        <h4>MEGAN Bingo</h4>
        <div className="bingo">
          <div className="done">✓ Connect with a speaker</div>
          <div className="done">✓ Connect with a virtual attendee</div>
          <div>Find a pet owner</div>
          <div>Find someone speaking 3+ languages</div>
        </div>
      </div>
    );
  if (m.type === "suggestions")
    return (
      <div>
        <h4>Suggested connections</h4>
        {people
          .filter((x) => x.id !== u.id)
          .slice(0, 5)
          .map((x) => (
            <PCard
              key={x.id}
              p={x}
              sub={`${x.company} · ${x.attendance} · ${(x.interests || []).join(" · ")}`}
              onConnect={connect}
            />
          ))}
      </div>
    );
  if (m.type === "vendor") {
    const v = vendors.find((x) => x.id === m.vendorId),
      ps = people.filter((x) => x.company === v?.name);
    return (
      <div>
        <h4>{v?.name} representatives</h4>
        <p>{v?.booth}</p>
        {ps.map((x) => (
          <PCard
            key={x.id}
            p={x}
            sub={`${x.attendance} · ${(x.interests || []).join(" · ")}`}
            onConnect={connect}
          />
        ))}
      </div>
    );
  }
  if (m.type === "connect") {
    const p = byId(m.personId);
    return p ? (
      <Connect p={p} cmd={cmd} />
    ) : (
      <div className="card">Connection unavailable</div>
    );
  }
  if (m.type === "connections")
    return (
      <div>
        <h4>My connections</h4>
        {connections.accepted
          .map((x) => byId(x.personId))
          .filter(Boolean)
          .map((x) => (
            <PCard key={x.id} p={x} sub="Connected" action={null} />
          ))}
      </div>
    );
  if (m.type === "incoming")
    return (
      <div>
        <h4>Pending incoming</h4>
        {connections.incoming
          .map((x) => byId(x.personId))
          .filter(Boolean)
          .map((x) => (
            <PCard key={x.id} p={x} sub="Wants to connect" action="Accept" />
          ))}
      </div>
    );
  if (m.type === "outgoing")
    return (
      <div>
        <h4>Pending outgoing</h4>
        {connections.outgoing
          .map((x) => byId(x.personId))
          .filter(Boolean)
          .map((x) => (
            <PCard key={x.id} p={x} sub="Waiting for response" action={null} />
          ))}
      </div>
    );
  if (m.type === "chat")
    return (
      <div className="card">
        <h4>Quick chat with {m.p.name}</h4>
        <p>
          <b>{m.p.name}:</b> Hi, happy to connect.
        </p>
      </div>
    );
  if (m.type === "contact")
    return (
      <div className="card">
        <h4>{m.label}</h4>
        <strong>{m.value}</strong>
      </div>
    );
  if (m.type === "reminder")
    return (
      <div className="card">
        <h4>🔔 Starts in 15 minutes</h4>
        <b>MGIT and Vendor Fair</b>
      </div>
    );
  if (m.type === "wifi")
    return (
      <div className="card">
        <b>SSID: {wifi.ssid}</b>
        <span>Password: {wifi.password}</span>
      </div>
    );
  return <div className="card">{m.text || `Unsupported: ${m.type}`}</div>;
}
function App() {
  const [people, setPeople] = useState([]),
    [u, setU] = useState(null),
    [sessions, setSessions] = useState([]),
    [vendors, setVendors] = useState([]),
    [connections, setConnections] = useState({
      accepted: [],
      incoming: [],
      outgoing: [],
    }),
    [day, setDay] = useState(currentConferenceDate),
    [msgs, setMsgs] = useState([]),
    [input, setInput] = useState(""),
    [ready, setReady] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    (async () => {
      const defaults = [
        { from: "m", type: "welcome" },
        {
          from: "m",
          type: "text",
          text: "Guest mode provides public agenda and WiFi. Register to unlock personal features.",
        },
      ];
      const [p, user, s, v, c, m] = await Promise.all([
        attendeeService.getAll(),
        attendeeService.getCurrent(),
        sessionsService.getAll(),
        vendorsService.getAll(),
        connectionsService.getAll(),
        chatService.load(defaults),
      ]);
      setPeople(p);
      setU(user);
      setSessions(s);
      setVendors(v);
      setConnections(c);
      setMsgs(m);
      setReady(true);
    })().catch((e) => {
      console.error(e);
      setReady(true);
    });
  }, []);
  const append = (message) =>
      setMsgs((v) => {
        const n = [...v, message];
        chatService.save(n);
        return n;
      }),
    say = (type, text = "", extra = {}) =>
      append({ from: "m", type, text, ...extra }),
    ask = (text) => append({ from: "u", type: "text", text }),
    need = (f) => say("text", `Please register to use ${f}.`),
    connect = (p) => say("connect", "", { personId: p.id });
  async function register(form) {
    const result = await attendeeService.register(form);
    setPeople(await attendeeService.getAll());
    setU(result.person);
    say(
      "text",
      result.vendor
        ? `Welcome ${result.person.name}. MEGAN recognized ${result.vendor.name}. Your profile was saved.`
        : `Welcome ${result.person.name}. Your profile was saved.`,
    );
  }
  async function cmd(raw) {
    const q = raw.trim();
    if (!q) return;
    ask(q);
    const l = q.toLowerCase(),
      p = people.find((x) => l.includes(x.name.toLowerCase())),
      v = await vendorsService.findByText(l);
    if (l.includes("register")) say("register");
    else if (l.includes("my day")) u ? say("myday") : need("My Day");
    else if (l.includes("agenda")) say("agenda");
    else if (l.includes("badge")) u ? say("badge") : need("Badge");
    else if (l.includes("bingo")) u ? say("bingo") : need("Bingo");
    else if (
      v &&
      (l.includes("connect me with") || l.includes("connect me to"))
    )
      u ? say("vendor", "", { vendorId: v.id }) : need("Connect Me");
    else if (l.includes("my connections"))
      u ? say("connections") : need("connections");
    else if (l.includes("incoming"))
      u ? say("incoming") : need("incoming requests");
    else if (l.includes("outgoing"))
      u ? say("outgoing") : need("outgoing requests");
    else if (l.includes("connect me"))
      u ? say("suggestions") : need("Connect Me");
    else if (l.startsWith("meet ") && p)
      say(
        "text",
        `MEGAN suggested Coffee Corner for an on-site meeting with ${p.name}.`,
      );
    else if (l.includes("quick chat") && p) say("chat", "", { p });
    else if (l.includes("show email") && p)
      say("contact", "", { label: `Email for ${p.name}`, value: p.email });
    else if (l.includes("show phone") && p)
      say("contact", "", { label: `Phone for ${p.name}`, value: p.phone });
    else if (l.includes("reminder")) u ? say("reminder") : need("reminders");
    else if (l.includes("wifi")) say("wifi");
    else
      say(
        "text",
        "Try Register, Agenda, My Day, Badge, Bingo, Connect me, or Connect me with Microsoft.",
      );
    setInput("");
    setTimeout(
      () =>
        ref.current?.scrollTo({
          top: ref.current.scrollHeight,
          behavior: "smooth",
        }),
      0,
    );
  }
  if (!ready) return <div className="loading">Loading MEGAN…</div>;
  const currentDate = currentConferenceDate;
  const currentTime = event.current.slice(11, 16);
  const currentDayLabel = days.find((item) => item.date === currentDate)?.label;
  const nextSession = sessions
    .filter((item) => item.date === currentDate && item.start > currentTime)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const upNextLabel = nextSession
    ? `${nextSession.title} (${nextSession.start})`
    : "End of Event Day";
  const chips = u
    ? [
        "Show my day",
        "Show my badge",
        "Show Bingo",
        "Show my connections",
        "Connect me",
      ]
    : ["Register", "Show agenda", "Show WiFi"];
  return (
    <div className="stage">
      <main className="phone">
        <header
          style={{
            backgroundImage: `linear-gradient(#8d000055,#8d000055),url(${banner})`,
          }}
        >
          <div>
            <img src={logo} />
            <strong>{event.shortName}</strong>
            <span className="event-time-line">
              {currentDayLabel} · {currentTime}
            </span>
            <span className="up-next-line">Up Next: {upNextLabel}</span>
          </div>
          <aside>
            <button>{u ? u.name : "Not registered yet"}</button>
            <span>{u ? `${u.attendance} • 🔔1` : "Guest"}</span>
            {u && (
              <small>
                <button onClick={() => cmd("show my connections")}>
                  🤝{connections.accepted.length}
                </button>{" "}
                •{" "}
                <button onClick={() => cmd("show incoming requests")}>
                  ↑{connections.incoming.length}
                </button>{" "}
                •{" "}
                <button onClick={() => cmd("show outgoing requests")}>
                  ↓{connections.outgoing.length}
                </button>
              </small>
            )}
          </aside>
        </header>
        <section className="chat" ref={ref}>
          {msgs.map((m, i) => (
            <div className={m.from === "u" ? "row userrow" : "row"} key={i}>
              {m.from !== "u" && <img className="bot" src={avatar} />}
              <div className={m.from === "u" ? "bubble mine" : "bubble"}>
                <Content
                  m={m}
                  cmd={cmd}
                  u={u}
                  people={people}
                  sessions={sessions}
                  day={day}
                  setDay={setDay}
                  register={register}
                  connect={connect}
                  connections={connections}
                  vendors={vendors}
                />
              </div>
            </div>
          ))}
        </section>
        <div className="chips">
          {chips.map((x) => (
            <button key={x} onClick={() => cmd(x)}>
              {x}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cmd(input);
          }}
        >
          <button type="button">
            <Plus />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
          />
          <button>
            <Send size={18} />
          </button>
          <button type="button" className="mic">
            <Mic />
          </button>
        </form>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
