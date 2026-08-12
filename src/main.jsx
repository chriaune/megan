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
import VenueMap from "./components/VenueMap/VenueMap.jsx";
import {
  sessionsService,
  vendorsService,
  attendeeService,
  connectionsService,
  chatService,
  serviceConfig,
} from "./services/index.js";

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const guestUser = {
  id: "guest",
  name: "Guest",
  email: "",
  company: "",
  attendance: "Guest",
  role: "Guest",
  interests: [],
  bingoFacts: [],
};

const guestMessages = [{ from: "m", type: "welcome" }];

const MESSAGE_TYPES = {
  TEXT: "text",
  WELCOME: "welcome",
  REGISTER: "register",
  AGENDA: "agenda",
  MYDAY: "myday",
  BADGE: "badge",
  BINGO: "bingo",
  SUGGESTIONS: "suggestions",
  VENDOR: "vendor",
  CONFIRM_SIGNOUT: "confirmSignOut",
  VENUE: "venue",
  CONNECT: "connect",
  CONNECTIONS: "connections",
  INCOMING: "incoming",
  OUTGOING: "outgoing",
  CHAT: "chat",
  CONTACT: "contact",
  REMINDER: "reminder",
  WIFI: "wifi",
};

const STORAGE_KEYS = {
  SELECTED_TRACKS: "megan_selected_tracks",
  CHECKED_IN_SESSIONS: "megan_checked_in_sessions",
  ACTIVE_USER: "megan_active_user",
};

const CHECK_IN_WINDOW_MINUTES = 15;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const isGuest = (user) => !user || user.id === "guest";

const initials = (n) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isCurrentSession = (session, conferenceNow) => {
  const conferenceDate = conferenceNow.toISOString().slice(0, 10);
  if (session.date !== conferenceDate) return false;

  const currentMinutes =
    conferenceNow.getHours() * 60 + conferenceNow.getMinutes();
  const startMinutes = toMinutes(session.start);
  const endMinutes = toMinutes(session.end);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

const canCheckInToSession = (session, conferenceNow) => {
  const conferenceDate = conferenceNow.toISOString().slice(0, 10);

  // Can only check in on the session's date
  if (session.date !== conferenceDate) return false;

  const nowMinutes =
    conferenceNow.getHours() * 60 + conferenceNow.getMinutes();
  const startMinutes = toMinutes(session.start);
  const endMinutes = toMinutes(session.end);

  // Check-in window: 15 minutes before start until session ends
  const checkInOpenMinutes = startMinutes - CHECK_IN_WINDOW_MINUTES;

  return nowMinutes >= checkInOpenMinutes && nowMinutes < endMinutes;
};

const sessionsOverlap = (a, b) => {
  const aStart = toMinutes(a.start);
  const aEnd = toMinutes(a.end);
  const bStart = toMinutes(b.start);
  const bEnd = toMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
};

const groupOverlappingSessions = (items) => {
  const groups = [];
  items.forEach((session) => {
    const matchingGroup = groups.find((group) =>
      group.some((existingSession) => sessionsOverlap(existingSession, session))
    );
    if (matchingGroup) {
      matchingGroup.push(session);
    } else {
      groups.push([session]);
    }
  });
  return groups;
};

const formatDateLabel = (dateStr) => {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
  });
};

// ============================================================================
// COMPONENTS
// ============================================================================

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

function Session({
  s,
  hideTime = false,
  selectedTrack = false,
  current = false,
}) {
  return (
    <div className={`session ${selectedTrack ? "session-selected" : ""}`}>
      {!hideTime && <b>{s.start}</b>}

      <div>
        <strong>
          {selectedTrack && <span className="track-check">✓ </span>}
          {current && !selectedTrack && <span className="live-label">LIVE </span>}
          {s.title}
        </strong>
        <span>{s.room}</span>
      </div>
    </div>
  );
}

function Register({ complete }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const validEmail = email.includes("@");
  const [company, setCompany] = useState("");
  const [attendance, setAttendance] = useState("Onsite");
  const [facts, setFacts] = useState([]);

  const isFormValid =
    lastName.trim() &&
    firstName.trim() &&
    company.trim() &&
    validEmail &&
    facts.length === 3;

  return (
    <div className="card">
      <h4>Register for {event.shortName}</h4>
      <input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <input
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {email && !validEmail && (
        <small style={{ color: "red" }}>
          Please enter a valid email address.
        </small>
      )}
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
                  : v
              )
            }
          />
          {x}
        </label>
      ))}
      <button
        className="red"
        disabled={!isFormValid}
        onClick={() =>
          complete({
            name: `${lastName} ${firstName}`.trim(),
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
  if (isGuest(u)) {
    return (
      <div className="card">
        <p>Please register to view your badge.</p>
      </div>
    );
  }

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
          <span
            className={i % 3 === 0 || i % 7 === 0 ? "on" : ""}
            key={i}
          />
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

function WelcomeMessage({ u }) {
  return (
    <>
      {isGuest(u) ? (
        <>
          <p>
            <b>Hello, I am M.E.G.A.N. 👋</b>
          </p>
          <p>
            Your Magna Event Guide and Assistant for the entire conference.
          </p>
          <p>You can ask me:</p>
          <ul>
            <li>Show agenda</li>
            <li>Show WiFi</li>
            <li>Show venue map</li>
          </ul>
          <p>
            To use personal features such as My Badge, MEGAN Bingo, My
            Connections and Connect Me, please register first.
          </p>
        </>
      ) : (
        <>
          <p>
            <b>Welcome back {u.name}! 👋</b>
          </p>
          <p>How can I help you today?</p>
        </>
      )}
    </>
  );
}

function AgendaView({ sessions, currentConferenceDate, days: daysList }) {
  const [agendaDay, setAgendaDay] = useState(currentConferenceDate);
  const conferenceNow = new Date(event.current);
  const currentMinutes =
    conferenceNow.getHours() * 60 + conferenceNow.getMinutes();

  const daySessions = sessions
    .filter((x) => x.date === agendaDay)
    .filter((x) => {
      const [eh, em] = x.end.split(":").map(Number);
      const endMinutes = eh * 60 + em;
      return endMinutes >= currentMinutes;
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const groupedSessions = Object.values(
    daySessions.reduce((groups, session) => {
      const key = session.start;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(session);
      return groups;
    }, {})
  );

  return (
    <div>
      <h4>Agenda</h4>
      <div className="agenda-day-tabs">
        {daysList
          .filter((d) => d.date >= currentConferenceDate)
          .map((d) => (
            <button
              key={d.date}
              className={`agenda-day-tab ${
                agendaDay === d.date ? "active" : ""
              }`}
              onClick={() => setAgendaDay(d.date)}
            >
              {d.label.includes("Day 2")
                ? "Tue 17"
                : d.label.includes("Day 3")
                ? "Wed 18"
                : "Mon 16"}
            </button>
          ))}
      </div>

      {groupedSessions.map((group) => {
        const isCurrentGroup = group.some((s) =>
          isCurrentSession(s, conferenceNow)
        );
        const isParallelGroup = group.length > 1;
        const groupStart = group[0].start;

        return (
          <div
            className={`agenda-time-group ${
              isCurrentGroup ? "agenda-current-group" : ""
            }`}
            key={`${agendaDay}-${groupStart}`}
          >
            <div
              className={`agenda-time-label ${
                isCurrentGroup ? "agenda-time-live" : ""
              }`}
            >
              {groupStart}
              {isCurrentGroup && (
                <span className="agenda-live">LIVE</span>
              )}
            </div>

            <div
              className={
                isParallelGroup
                  ? "agenda-session-row agenda-session-row-parallel"
                  : "agenda-session-row"
              }
            >
              {group.map((x) => (
                <Session
                  key={x.id}
                  s={x}
                  hideTime={isParallelGroup}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyDayView({
  sessions,
  day,
  setDay,
  days: daysList,
  currentConferenceDate,
  selectedTracks,
  selectTrackForGroup,
  checkedInSessions,
  checkInToSession,
  checkOutFromSession,
}) {
  const conferenceNow = new Date(event.current);
  const currentMinutes =
    conferenceNow.getHours() * 60 + conferenceNow.getMinutes();

  const daySessions = sessions
    .filter((x) => x.date === day)
    .filter((x) => {
      if (day > currentConferenceDate) {
        return true;
      }

      if (day === currentConferenceDate) {
        const [eh, em] = x.end.split(":").map(Number);
        const endMinutes = eh * 60 + em;
        return endMinutes >= currentMinutes;
      }

      return false;
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const groupedSessions = groupOverlappingSessions(daySessions);

  return (
    <div>
      <h4>My Day</h4>

      <div className="agenda-day-tabs">
        {daysList
          .filter((x) => x.date >= currentConferenceDate)
          .map((x) => (
            <button
              key={x.date}
              className={`agenda-day-tab ${x.date === day ? "active" : ""}`}
              onClick={() => setDay(x.date)}
            >
              {formatDateLabel(x.date)}
            </button>
          ))}
      </div>

      {groupedSessions.map((group) => {
        const isCurrentGroup = group.some((s) =>
          isCurrentSession(s, conferenceNow)
        );
        const isParallelGroup = group.length > 1;
        const groupStart = group.map((x) => x.start).sort()[0];

        const groupKey = `${day}-${group
          .map((item) => item.id)
          .sort()
          .join("-")}`;

        return (
          <div
            className={`agenda-time-group ${
              isCurrentGroup ? "agenda-current-group" : ""
            }`}
            key={groupKey}
          >
            <div
              className={`agenda-time-label ${
                isCurrentGroup ? "agenda-time-live" : ""
              }`}
            >
              {groupStart}
            </div>
            {isParallelGroup && (
              <div className="track-picker-label">
                Choose your preferred session
              </div>
            )}
            <div
              className={
                isParallelGroup
                  ? "agenda-session-row agenda-session-row-parallel"
                  : "agenda-session-row"
              }
            >
              {group.map((x) => {
                const selectedSessionId = selectedTracks[groupKey];
                const isSelectedTrack = selectedSessionId === x.id;
                const isCurrentTrack = isCurrentSession(x, conferenceNow);
                const canCheckIn = canCheckInToSession(x, conferenceNow);
                const checkInData = checkedInSessions[x.id];
                const isCheckedIn = checkInData?.checkedIn;

                if (!isParallelGroup) {
                  return (
                    <div key={x.id} className="track-session-content">
                      <Session
                        s={x}
                        hideTime={false}
                        current={isCurrentTrack}
                      />
                      {canCheckIn && (
                        <button
                          type="button"
                          className={`checkin-button ${isCheckedIn ? "checked-in" : ""}`}
                          onClick={() => checkInToSession(x.id)}
                          disabled={isCheckedIn}
                        >
                          {isCheckedIn ? "✓ Checked in" : "Check in"}
                        </button>
                      )}
                      {isCheckedIn && !canCheckIn && (
                        <button
                          type="button"
                          className="checkout-button"
                          onClick={() => checkOutFromSession(x.id)}
                        >
                          Check out
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={x.id}
                    type="button"
                    className={`track-session-button is-selectable ${
                      isSelectedTrack ? "is-selected" : ""
                    }`}
                    onClick={() => selectTrackForGroup(groupKey, x.id)}
                  >
                    <div className="track-session-content">
                      <Session
                        s={x}
                        hideTime={false}
                        selectedTrack={isSelectedTrack}
                        current={isCurrentTrack}
                      />
                      {isSelectedTrack && canCheckIn && (
                        <button
                          type="button"
                          className={`checkin-button ${
                            isCheckedIn ? "checked-in" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            checkInToSession(x.id);
                          }}
                          disabled={isCheckedIn}
                        >
                          {isCheckedIn ? "✓ Checked in" : "Check in"}
                        </button>
                      )}
                      {isSelectedTrack && isCheckedIn && !canCheckIn && (
                        <button
                          type="button"
                          className="checkout-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkOutFromSession(x.id);
                          }}
                        >
                          Check out
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BingoCard() {
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
}

function SuggestionsView({ people, u, connect }) {
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
            sub={`${x.company} · ${x.attendance} · ${(x.interests || []).join(
              " · "
            )}`}
            onConnect={connect}
          />
        ))}
    </div>
  );
}

function VendorView({ vendors, people, connect, vendorId }) {
  const v = vendors.find((x) => x.id === vendorId);
  const ps = people.filter((x) => x.company === v?.name);

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

function ConfirmSignOutView({ confirmSignOut, cancelSignOut }) {
  return (
    <div className="card">
      <h4>Do you really want to sign out?</h4>
      <p>
        To access your conference profile again, you will need to verify your
        email address.
      </p>
      <div className="confirm-actions">
        <button className="red" onClick={confirmSignOut}>
          Sign Out
        </button>
        <button onClick={cancelSignOut}>Cancel</button>
      </div>
    </div>
  );
}

function VenueView({ u, sessions, focusSessionId, selectedTracks }) {
  return (
    <div>
      <VenueMap
        user={u}
        sessions={sessions}
        now={new Date(event.current)}
        focusSessionId={focusSessionId}
        selectedTracks={selectedTracks || {}} // ✅ Ensure it's always an object
        // onCheckIn={onCheckIn}
      />
    </div>
  );
}

function ConnectionsView({ connections, people, byId }) {
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
}

function IncomingView({ connections, people, byId, connect }) {
  return (
    <div>
      <h4>Pending incoming</h4>
      {connections.incoming
        .map((x) => byId(x.personId))
        .filter(Boolean)
        .map((x) => (
          <PCard
            key={x.id}
            p={x}
            sub="Wants to connect"
            action="Accept"
            onConnect={connect}
          />
        ))}
    </div>
  );
}

function OutgoingView({ connections, people, byId }) {
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
}

function ChatView({ p }) {
  return (
    <div className="card">
      <h4>Quick chat with {p.name}</h4>
      <p>
        <b>{p.name}:</b> Hi, happy to connect.
      </p>
    </div>
  );
}

function ContactView({ label, value }) {
  return (
    <div className="card">
      <h4>{label}</h4>
      <strong>{value}</strong>
    </div>
  );
}

function ReminderView() {
  return (
    <div className="card">
      <h4>🔔 Starts in 15 minutes</h4>
      <b>MGIT and Vendor Fair</b>
    </div>
  );
}

function WiFiView() {
  return (
    <div className="card">
      <b>SSID: {wifi.ssid}</b>
      <span>Password: {wifi.password}</span>
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
  confirmSignOut,
  cancelSignOut,
  selectedTracks,
  selectTrackForGroup,
  checkedInSessions,
  checkInToSession,
  checkOutFromSession,
}) {
  const byId = (id) => people.find((x) => x.id === id);

  const contentMap = {
    [MESSAGE_TYPES.TEXT]: () => <p>{m.text}</p>,
    [MESSAGE_TYPES.WELCOME]: () => <WelcomeMessage u={u} />,
    [MESSAGE_TYPES.REGISTER]: () => <Register complete={register} />,
    [MESSAGE_TYPES.AGENDA]: () => (
      <AgendaView
        sessions={sessions}
        currentConferenceDate={currentConferenceDate}
        days={days}
      />
    ),
    [MESSAGE_TYPES.MYDAY]: () => (
      <MyDayView
        sessions={sessions}
        day={day}
        setDay={setDay}
        days={days}
        currentConferenceDate={currentConferenceDate}
        selectedTracks={selectedTracks}
        selectTrackForGroup={selectTrackForGroup}
        checkedInSessions={checkedInSessions}
        checkInToSession={checkInToSession}
        checkOutFromSession={checkOutFromSession}
      />
    ),
    [MESSAGE_TYPES.BADGE]: () => <Badge u={u} />,
    [MESSAGE_TYPES.BINGO]: () => <BingoCard />,
    [MESSAGE_TYPES.SUGGESTIONS]: () => (
      <SuggestionsView people={people} u={u} connect={connect} />
    ),
    [MESSAGE_TYPES.VENDOR]: () => (
      <VendorView
        vendors={vendors}
        people={people}
        connect={connect}
        vendorId={m.vendorId}
      />
    ),
    [MESSAGE_TYPES.CONFIRM_SIGNOUT]: () => (
      <ConfirmSignOutView
        confirmSignOut={confirmSignOut}
        cancelSignOut={cancelSignOut}
      />
    ),
[MESSAGE_TYPES.VENUE]: () => (
  <VenueView 
    u={u} 
    sessions={sessions} 
    focusSessionId={m.focusSessionId}
    selectedTracks={selectedTracks} // ✅ ADD THIS LINE
  />
),
    [MESSAGE_TYPES.CONNECT]: () => {
      const p = byId(m.personId);
      return p ? (
        <Connect p={p} cmd={cmd} />
      ) : (
        <div className="card">Connection unavailable</div>
      );
    },
    [MESSAGE_TYPES.CONNECTIONS]: () => (
      <ConnectionsView connections={connections} people={people} byId={byId} />
    ),
    [MESSAGE_TYPES.INCOMING]: () => (
      <IncomingView
        connections={connections}
        people={people}
        byId={byId}
        connect={connect}
      />
    ),
    [MESSAGE_TYPES.OUTGOING]: () => (
      <OutgoingView connections={connections} people={people} byId={byId} />
    ),
    [MESSAGE_TYPES.CHAT]: () => <ChatView p={m.p} />,
    [MESSAGE_TYPES.CONTACT]: () => (
      <ContactView label={m.label} value={m.value} />
    ),
    [MESSAGE_TYPES.REMINDER]: () => <ReminderView />,
    [MESSAGE_TYPES.WIFI]: () => <WiFiView />,
  };

  const renderer = contentMap[m.type];
  return renderer ? (
    renderer()
  ) : (
    <div className="card">{m.text || `Unsupported: ${m.type}`}</div>
  );
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (!key) return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (key) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  return [storedValue, setValue];
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [people, setPeople] = useState([]);
  const [u, setU] = useState(guestUser);
  const [sessions, setSessions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [connections, setConnections] = useState({
    accepted: [],
    incoming: [],
    outgoing: [],
  });
  const [day, setDay] = useState(currentConferenceDate);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);

  // Initialize storage keys - will be updated when user loads
  const [selectedTracks, setSelectedTracks] = useLocalStorage(
    STORAGE_KEYS.SELECTED_TRACKS,
    {}
  );
  const [checkedInSessions, setCheckedInSessions] = useLocalStorage(
    STORAGE_KEYS.CHECKED_IN_SESSIONS,
    {}
  );

  const ref = useRef(null);

  // Initialize app
  useEffect(() => {
    (async () => {
      try {
        const [p, s, v, c] = await Promise.all([
          attendeeService.getAll(),
          sessionsService.getAll(),
          vendorsService.getAll(),
          connectionsService.getAll(),
        ]);
        setPeople(p);
        setSessions(s);
        setVendors(v);
        setConnections(c);

        const savedUser = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setU(parsedUser);
        } else {
          setU(guestUser);
        }

        setMsgs(guestMessages);
        setReady(true);
      } catch (e) {
        console.error("Error initializing app:", e);
        setReady(true);
      }
    })();
  }, []);

  const append = (message) => {
    setMsgs((current) => [...current, message]);
  };

  const say = (type, text = "", extra = {}) =>
    append({ from: "m", type, text, ...extra });

  const ask = (text) =>
    append({ from: "u", type: MESSAGE_TYPES.TEXT, text });

  const need = (f) =>
    say(MESSAGE_TYPES.TEXT, `Please register to use ${f}.`);

  const connect = (p) =>
    say(MESSAGE_TYPES.CONNECT, "", { personId: p.id });

  const scrollToBottom = () => {
    setTimeout(() => {
      ref.current?.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }, 0);
  };

  async function register(form) {
    try {
      const result = await attendeeService.register(form);
      setPeople(await attendeeService.getAll());
      setU(result.person);
      setProfileMenuOpen(false);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(result.person));
      say(
        MESSAGE_TYPES.TEXT,
        result.vendor
          ? `Welcome ${result.person.name}. MEGAN recognized ${result.vendor.name}. Your profile was saved.`
          : `Welcome ${result.person.name}. Thank you for registering! How can I help you now?`
      );
    } catch (error) {
      console.error("Registration error:", error);
      say(MESSAGE_TYPES.TEXT, "Registration failed. Please try again.");
    }
  }

  function selectTrackForGroup(groupKey, sessionId) {
    setSelectedTracks((prev) => {
      const alreadySelected = prev[groupKey] === sessionId;

      if (alreadySelected) {
        const next = { ...prev };
        delete next[groupKey];
        return next;
      }

      return {
        ...prev,
        [groupKey]: sessionId,
      };
    });
  }

  function checkInToSession(sessionId) {
    setCheckedInSessions((prev) => ({
      ...prev,
      [sessionId]: {
        checkedIn: true,
        checkedInAt: event.current,
      },
    }));
  }

  function checkOutFromSession(sessionId) {
    setCheckedInSessions((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }

  function requestSignOut() {
    say(MESSAGE_TYPES.CONFIRM_SIGNOUT);
  }

  function confirmSignOut() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_TRACKS);
    localStorage.removeItem(STORAGE_KEYS.CHECKED_IN_SESSIONS);
    setU(guestUser);
    setMsgs(guestMessages);
    setSelectedTracks({});
    setCheckedInSessions({});
  }

  function cancelSignOut() {
    say(MESSAGE_TYPES.TEXT, "Sign out canceled.");
  }

  async function cmd(raw) {
    const q = raw.trim();
    if (!q) return;

    ask(q);

    const l = q.toLowerCase();
    const person = people.find((x) => l.includes(x.name.toLowerCase()));
    const vendor = await vendorsService.findByText(l);

    // Command routing
    if (l.includes("register")) {
      say(MESSAGE_TYPES.REGISTER);
    } else if (l.includes("my day")) {
      !isGuest(u) ? say(MESSAGE_TYPES.MYDAY) : need("My Day");
    } else if (l.includes("agenda")) {
      say(MESSAGE_TYPES.AGENDA);
    } else if (
      l.includes("venue") ||
      l.includes("map") ||
      l.includes("floorplan")
    ) {
      say(MESSAGE_TYPES.VENUE);
    } else if (l.includes("badge")) {
      !isGuest(u) ? say(MESSAGE_TYPES.BADGE) : need("Badge");
    } else if (l.includes("bingo")) {
      !isGuest(u) ? say(MESSAGE_TYPES.BINGO) : need("Bingo");
    } else if (
      vendor &&
      (l.includes("connect me with") || l.includes("connect me to"))
    ) {
      !isGuest(u)
        ? say(MESSAGE_TYPES.VENDOR, "", { vendorId: vendor.id })
        : need("Connect Me");
    } else if (l.includes("my connections")) {
      !isGuest(u)
        ? say(MESSAGE_TYPES.CONNECTIONS)
        : need("connections");
    } else if (l.includes("incoming")) {
      !isGuest(u) ? say(MESSAGE_TYPES.INCOMING) : need("incoming requests");
    } else if (l.includes("outgoing")) {
      !isGuest(u) ? say(MESSAGE_TYPES.OUTGOING) : need("outgoing requests");
    } else if (l.includes("connect me")) {
      !isGuest(u)
        ? say(MESSAGE_TYPES.SUGGESTIONS)
        : need("Connect Me");
    } else if (l.startsWith("meet ") && person) {
      say(
        MESSAGE_TYPES.TEXT,
        `MEGAN suggested Coffee Corner for an on-site meeting with ${person.name}.`
      );
    } else if (l.includes("quick chat") && person) {
      say(MESSAGE_TYPES.CHAT, "", { p: person });
    } else if (l.includes("show email") && person) {
      say(MESSAGE_TYPES.CONTACT, "", {
        label: `Email for ${person.name}`,
        value: person.email,
      });
    } else if (l.includes("show phone") && person) {
      say(MESSAGE_TYPES.CONTACT, "", {
        label: `Phone for ${person.name}`,
        value: person.phone,
      });
    } else if (l.includes("reminder")) {
      !isGuest(u) ? say(MESSAGE_TYPES.REMINDER) : need("reminders");
    } else if (l.includes("wifi")) {
      say(MESSAGE_TYPES.WIFI);
    } else {
      say(
        MESSAGE_TYPES.TEXT,
        "Try Register, Agenda, My Day, Badge, Bingo, Connect me, or Connect me with Microsoft."
      );
    }

    setInput("");
    scrollToBottom();
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

  const chips = !isGuest(u)
    ? [
        "Show my day",
        "Show my badge",
        "Show venue",
        "Show Bingo",
        "Show my connections",
        "Connect me",
      ]
    : ["Register", "Show agenda", "Show WiFi", "Show venue"];

  return (
    <div className="stage">
      <main className="phone">
        <header
          style={{
            backgroundImage: `linear-gradient(#8d000055,#8d000055),url(${banner})`,
          }}
        >
          <div>
            <img src={logo} alt="Logo" />
            <strong>{event.shortName}</strong>
            <span className="event-time-line">
              {currentDayLabel} · {currentTime}
            </span>
            <span className="up-next-line">Up Next: {upNextLabel}</span>
          </div>
          <aside style={{ position: "relative" }}>
            <button
              className="profile-button"
              onClick={() =>
                !isGuest(u) && setProfileMenuOpen(!profileMenuOpen)
              }
            >
              {isGuest(u) ? "Not registered yet" : u.name}
            </button>
            {!isGuest(u) && profileMenuOpen && (
              <div className="profile-menu">
                <button onClick={requestSignOut}>Sign Out</button>
              </div>
            )}
            <span>
              {isGuest(u) ? "Guest" : `${u.attendance} • 🔔1`}
            </span>
            {!isGuest(u) && (
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
              {m.from !== "u" && <img className="bot" src={avatar} alt="MEGAN" />}
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
                  confirmSignOut={confirmSignOut}
                  cancelSignOut={cancelSignOut}
                  selectedTracks={selectedTracks}
                  selectTrackForGroup={selectTrackForGroup}
                  checkedInSessions={checkedInSessions}
                  checkInToSession={checkInToSession}
                  checkOutFromSession={checkOutFromSession}
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
          <button type="submit">
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