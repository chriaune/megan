import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Phone,
  Trophy,
  Plus,
  Send,
} from "lucide-react";

import "./styles.css";
import banner from "./assets/header-banner.png";
import logo from "./assets/comp-logo.png";
import logolimit from "./assets/comp-logo-limited.png";
import { QRCodeCanvas } from "qrcode.react";
import avatar from "./assets/avatar.png";
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
import { travelInfo } from "./data/travel.js";

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

function generateBadgeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

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
  TRAVEL: "travel",
  MAGIC_LINK: "magicLink",
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

  if (session.date !== conferenceDate) return false;

  const nowMinutes =
    conferenceNow.getHours() * 60 + conferenceNow.getMinutes();
  const startMinutes = toMinutes(session.start);
  const endMinutes = toMinutes(session.end);

  const checkInOpenMinutes = startMinutes - CHECK_IN_WINDOW_MINUTES;

  return nowMinutes >= checkInOpenMinutes && nowMinutes < endMinutes;
};

const sessionsOverlap = (a, b) => {
  if (a.date !== b.date) {
    return false;
  }

  const aStart = toMinutes(a.start);
  const aEnd = toMinutes(a.end);
  const bStart = toMinutes(b.start);
  const bEnd = toMinutes(b.end);

  return aStart < bEnd && bStart < aEnd;
};

const groupOverlappingSessions = (items) => {
  const sorted = [...items].sort((a, b) => {
    const startCompare = toMinutes(a.start) - toMinutes(b.start);
    if (startCompare !== 0) return startCompare;
    return toMinutes(a.end) - toMinutes(b.end);
  });

  const groups = [];
  let currentGroup = [];
  let currentGroupEnd = null;

  sorted.forEach((session) => {
    const sessionStart = toMinutes(session.start);
    const sessionEnd = toMinutes(session.end);

    if (
      currentGroup.length === 0 ||
      sessionStart >= currentGroupEnd
    ) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      currentGroup = [session];
      currentGroupEnd = sessionEnd;
    } else {
      currentGroup.push(session);
      currentGroupEnd = Math.max(currentGroupEnd, sessionEnd);
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

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
        Simulate verification link
      </button>
    </div>
  );
}

function Badge({ u, openQr }) {
  if (isGuest(u)) {
    return (
      <div className="card">
        <p>Please register to view your badge.</p>
      </div>
    );
  }

  const badgeQrValue = JSON.stringify({
    type: "MEGAN_BADGE",
    event: event.shortName,
    attendeeId: u.id,
    name: u.name,
    company: u.company,
    attendance: u.attendance,
  });

  return (
    <div className="badge">
      <div>
        <strong>{u.name}</strong>
        <span>{u.company}</span>
        <span>{u.attendance}</span>
        <em>{u.role}</em>
        <span>
          🎯 Badge Code: <b>{u.badgeCode}</b>
        </span>
      </div>

      <div
        className="badge-qr-wrap"
        style={{ cursor: "pointer" }}
        onClick={() => openQr(badgeQrValue)}
      >
        <QRCodeCanvas
          value={badgeQrValue}
          size={118}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={true}
        />
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
      <button onClick={() => cmd(`show badge code for ${p.name}`)}>
        <Trophy />
        <span>
          <b>Bingo Code</b>
          <em>Show verification code</em>
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
            Your MobileTech Event Guide and Assistant for the entire conference.
          </p>
          <p>You can ask me:</p>
          <ul>
            <li>Show agenda</li>
            <li>Show WiFi</li>
            <li>Show venue map</li>
            <li>Show travel info</li>
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
      if (agendaDay > currentConferenceDate) {
        return true;
      }

      if (agendaDay === currentConferenceDate) {
        const [eh, em] = x.end.split(":").map(Number);
        const endMinutes = eh * 60 + em;

        return endMinutes >= currentMinutes;
      }

      return false;
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
        const parallelCount = Math.min(group.length, 4);

        const groupKey = `${agendaDay}-${groupStart}-${group
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
              {isCurrentGroup && (
                <span className="agenda-live">LIVE</span>
              )}
            </div>

            {isParallelGroup && (
              <div className="track-picker-label">
                Parallel sessions
              </div>
            )}

            <div
              className={
                isParallelGroup
                  ? "agenda-session-row agenda-session-row-parallel"
                  : "agenda-session-row"
              }
              style={{
                "--parallel-count": parallelCount,
              }}
            >
              {group.map((x) => (
                <Session
                  key={x.id}
                  s={x}
                  hideTime={false}
                  current={isCurrentSession(x, conferenceNow)}
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

  const selectedSessions = sessions.filter((s) => selectedTracks?.[s.id]);

  const conflicts = [];

  selectedSessions.forEach((a, index) => {
    selectedSessions.slice(index + 1).forEach((b) => {
      if (sessionsOverlap(a, b)) {
        conflicts.push([a, b]);
      }
    });
  });

  const selectedCount = Object.keys(selectedTracks || {}).length;

  return (
    <div>
      <h4>My Day</h4>

      <p>
        {selectedCount} session
        {selectedCount !== 1 ? "s" : ""} selected
      </p>

      {conflicts.length > 0 && (
        <div className="conflict-warning">
          <strong>⚠ Schedule Conflicts</strong>

          {conflicts.map(([a, b], idx) => (
            <div key={idx}>
              {a.title} ↔ {b.title}
            </div>
          ))}
        </div>
      )}

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
        const parallelCount = Math.min(group.length, 4);

        const groupKey = `${day}-${groupStart}-${group
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
                Parallel sessions
              </div>
            )}

            <div
              className={
                isParallelGroup
                  ? "agenda-session-row agenda-session-row-parallel"
                  : "agenda-session-row"
              }
              style={{
                "--parallel-count": parallelCount,
              }}
            >
              {group.map((x) => {
                const isSelectedTrack = Boolean(selectedTracks?.[x.id]);
                const isCurrentTrack = isCurrentSession(x, conferenceNow);
                const canCheckIn = canCheckInToSession(x, conferenceNow);
                const checkInData = checkedInSessions?.[x.id];
                const isCheckedIn = checkInData?.checkedIn;

                return (
                  <div
                    key={x.id}
                    role="button"
                    tabIndex={0}
                    className={`track-session-button is-selectable ${
                      isSelectedTrack ? "is-selected" : ""
                    }`}
                    onClick={() => selectTrackForGroup(null, x.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectTrackForGroup(null, x.id);
                      }
                    }}
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
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BingoCard({ people, verifyBingoCode }) {
  const [codes, setCodes] = useState({
    speaker: "",
    virtual: "",
    petOwner: "",
    languages: "",
  });

  const [completedChallenges, setCompletedChallenges] = useState({
    speaker: false,
    virtual: false,
    petOwner: false,
    languages: false,
  });

  const BINGO_CHALLENGES = [
    {
      id: "speaker",
      title: "Connect with a speaker",
      placeholder: "Speaker Badge Code",
      description: "Find and connect with a conference speaker",
    },
    {
      id: "virtual",
      title: "Connect with a virtual attendee",
      placeholder: "Virtual Badge Code",
      description: "Connect with someone attending virtually",
    },
    {
      id: "petOwner",
      title: "Find a pet owner",
      placeholder: "Pet Owner Badge Code",
      description: "Discover someone who loves their furry friends",
    },
    {
      id: "languages",
      title: "Find someone speaking 3+ languages",
      placeholder: "Language Badge Code",
      description: "Meet a polyglot at the conference",
    },
  ];

  const updateCode = (key, value) => {
    setCodes((prev) => ({
      ...prev,
      [key]: value.toUpperCase(),
    }));
  };

  const handleVerify = (key) => {
    if (!codes[key].trim()) {
      return;
    }

    verifyBingoCode(codes[key], key, (isValid) => {
      if (isValid) {
        setCompletedChallenges((prev) => ({
          ...prev,
          [key]: true,
        }));
        setCodes((prev) => ({
          ...prev,
          [key]: "",
        }));
      }
    });
  };

  const completedCount = Object.values(completedChallenges).filter(
    Boolean
  ).length;
  const totalChallenges = BINGO_CHALLENGES.length;
  const bingoComplete = completedCount === totalChallenges;

  return (
    <div>
      <h4>🎯 MEGAN Bingo</h4>

      <div className="bingo-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(completedCount / totalChallenges) * 100}%` }}
          />
        </div>
        <p className="progress-text">
          {completedCount} of {totalChallenges} completed
        </p>
      </div>

      {bingoComplete && (
        <div className="bingo-complete-banner">
          <h3>🎉 Bingo Complete!</h3>
          <p>You've completed all MEGAN Bingo challenges!</p>
        </div>
      )}

      <div className="bingo bingo-with-codes">
        {BINGO_CHALLENGES.map((challenge) => {
          const isCompleted = completedChallenges[challenge.id];
          const codeValue = codes[challenge.id];

          return (
            <div
              key={challenge.id}
              className={`bingo-challenge ${isCompleted ? "done" : ""}`}
            >
              <div className="challenge-header">
                {isCompleted && <span className="check-mark">✓</span>}
                <strong>{challenge.title}</strong>
              </div>

              <p className="challenge-description">{challenge.description}</p>

              {!isCompleted && (
                <div className="challenge-input-group">
                  <input
                    type="text"
                    placeholder={challenge.placeholder}
                    value={codeValue}
                    onChange={(e) => updateCode(challenge.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleVerify(challenge.id);
                      }
                    }}
                    maxLength="6"
                    disabled={isCompleted}
                  />

                  <button
                    className="verify-button"
                    onClick={() => handleVerify(challenge.id)}
                    disabled={!codeValue.trim() || isCompleted}
                  >
                    Verify
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bingo-tips">
        <p>
          💡 <strong>Tip:</strong> Ask other attendees for their badge codes to
          complete challenges!
        </p>
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

function VenueView({
  u,
  sessions,
  focusSessionId,
  focusMode,
  selectedTracks,
}) {
  return (
    <div>
      <VenueMap
        user={u}
        sessions={sessions}
        now={new Date(event.current)}
        focusSessionId={focusSessionId}
        focusMode={focusMode}
        selectedTracks={selectedTracks || {}}
      />
    </div>
  );
}

function ConnectionsView({ connections, people, byId, cmd }) {
  const connectedPeople = connections.accepted
    .map((x) => byId(x.personId))
    .filter(Boolean);

  const handleShowBingoCode = (personName) => {
    cmd(`show badge code for ${personName}`);
  };

  return (
    <div>
      <h4>My connections</h4>

      {connectedPeople.length === 0 ? (
        <div className="card">
          <p>You have no accepted connections yet.</p>
        </div>
      ) : (
        <div className="connections-list">
          {connectedPeople.map((person) => (
            <div key={person.id} className="connection-item">
              <PCard
                p={person}
                sub={`${person.company} · ${person.attendance}`}
                action="Message"
                onConnect={() => cmd(`quick chat with ${person.name}`)}
              />
              <button
                className="bingo-code-button"
                onClick={() => handleShowBingoCode(person.name)}
                title="View their badge code"
              >
                🎯 Bingo Code
              </button>
            </div>
          ))}
        </div>
      )}
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

function OutgoingView({ connections, people, byId, abortOutgoingRequest }) {
  const outgoingPeople = connections.outgoing
    .map((x) => byId(x.personId))
    .filter(Boolean);

  return (
    <div>
      <h4>Pending outgoing</h4>

      {outgoingPeople.length === 0 ? (
        <div className="card">
          <p>You have no pending outgoing requests.</p>
        </div>
      ) : (
        outgoingPeople.map((x) => (
          <div className="person" key={x.id}>
            <i>{initials(x.name)}</i>

            <div>
              <b>{x.name}</b>
              <span>Waiting for response</span>
            </div>

            <button
              className="abort-request-button"
              onClick={() => abortOutgoingRequest(x.id)}
            >
              Abort
            </button>
          </div>
        ))
      )}
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

function getSessionDateTime(session) {
  const timeValue =
    session.startTime ||
    session.start ||
    session.time ||
    session.displayTime;

  if (!timeValue) return null;

  if (String(timeValue).includes("T")) {
    const date = new Date(timeValue);
    return isNaN(date) ? null : date;
  }

  const sessionDate = session.date || currentConferenceDate;
  const date = new Date(`${sessionDate}T${timeValue}:00`);

  return isNaN(date) ? null : date;
}

function getSessionEndDateTime(session, startDate) {
  if (!startDate) return null;

  // Prefer explicit end time if available
  const endValue =
    session.endTime ||
    session.end ||
    session.finishTime;

  if (endValue) {
    if (String(endValue).includes("T")) {
      const endDate = new Date(endValue);
      return isNaN(endDate) ? null : endDate;
    }

    const fallbackDate = startDate.toISOString().slice(0, 10);
    const endDate = new Date(`${fallbackDate}T${endValue}:00`);
    return isNaN(endDate) ? null : endDate;
  }

  // Fallback duration if no end time exists
  const durationMinutes = session.durationMinutes || session.duration || 60;

  return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
}

function getReminderSession({ sessions, myAgenda, isRegistered, currentTime }) {
  const relevantSessions = isRegistered
    ? sessions.filter((session) => myAgenda.includes(session.id))
    : sessions;

  const sessionsWithDates = relevantSessions
    .map((session) => {
      const startDate = getSessionDateTime(session);
      const endDate = getSessionEndDateTime(session, startDate);

      return {
        ...session,
        startDate,
        endDate,
      };
    })
    .filter((session) => session.startDate && session.endDate);

  // 1. First check if there is an active session
  const activeSession = sessionsWithDates
    .filter(
      (session) =>
        session.startDate <= currentTime &&
        session.endDate > currentTime
    )
    .sort((a, b) => a.startDate - b.startDate)[0];

  if (activeSession) {
    return {
      type: "active",
      session: activeSession,
    };
  }

  // 2. If no active session, find the next upcoming one
  const nextSession = sessionsWithDates
    .filter((session) => session.startDate > currentTime)
    .sort((a, b) => a.startDate - b.startDate)[0];

  if (nextSession) {
    return {
      type: "next",
      session: nextSession,
    };
  }

  return null;
}

function ReminderView({
  sessions = [],
  myAgenda = [],
  isRegistered = false,
  showVenueForSession,
}) {
  const currentDate = currentConferenceDate;
const currentTime = event.current.slice(11, 16);

const myDaySessions = sessions
  .filter((s) => s.date === currentDate)
  .filter((s) => {
    const [eh, em] = s.end.split(":").map(Number);
    const endMinutes = eh * 60 + em;

    const [nh, nm] = currentTime.split(":").map(Number);
    const nowMinutes = nh * 60 + nm;

    return endMinutes >= nowMinutes;
  })
  .sort((a, b) => a.start.localeCompare(b.start));

let nextSession = myDaySessions.find(
  (s) => s.start > currentTime
);

if (!nextSession) {
  nextSession = sessions
    .filter((s) => s.start > currentTime)
    .sort((a, b) =>
      `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)
    )[0];
}

  if (!nextSession) {
    return (
      <div className="card">
        <p>No upcoming sessions found.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h4>🔔 Starts Soon</h4>

      <b>{nextSession.title}</b>

      <p>📍 {nextSession.room}</p>

      <button
        className="red"
        onClick={() => showVenueForSession(nextSession.id)}
      >
        🗺 Show in Venue Map
      </button>
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

function TravelView() {
  return (
    <div className="card">
      <h4 style={{ marginBottom: "12px" }}>
        🚗 Travel & Hotel
      </h4>

      <div className="travel-section">
        <h5>🏨 Hotel</h5>

        <p>
          {travelInfo.hotel.name}
          <br />
          {travelInfo.hotel.addressLine1}
          <br />
          {travelInfo.hotel.addressLine2}
        </p>

        <button
          className="red"
          onClick={() =>
            window.open(travelInfo.hotel.mapsUrl, "_blank")
          }
        >
          🗺 Open in Maps
        </button>
      </div>

      <div className="travel-section">
        <h5>📞 Contact</h5>

        <button
          className="red"
          onClick={() =>
            (window.location.href = `tel:${travelInfo.hotel.phone}`)
          }
        >
          Call Hotel
        </button>

        <p>{travelInfo.hotel.phone}</p>
      </div>

      <div className="travel-section">
        <h5>🅿 Parking</h5>

        <p>{travelInfo.parking.description}</p>
      </div>

      <div className="travel-section">
        <h5>✈ Airport</h5>

        <p>{travelInfo.airport.name}</p>
      </div>
    </div>
  );
}

function MagicLinkView({ email, token, verifyMagicLink }) {
  const demoLink = `${window.location.origin}/verify?token=${token}`;

  return (
    <div className="card magic-link-card">
      <h4>📧 Verification link sent</h4>

      <p>
        A verification link was sent to:
        <br />
        <strong>{email}</strong>
      </p>

      <p>
        For this demo, the email delivery is simulated. Click the verification
        link below to activate your MEGAN profile.
      </p>

      <div className="magic-link-box">
        {demoLink}
      </div>

      <button
        className="red"
        onClick={() => verifyMagicLink(token)}
      >
        Verify and continue
      </button>

      <small>
        Demo token expires after 15 minutes.
      </small>
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
  openQr,
  verifyMagicLink,
  verifyBingoCode,
  abortOutgoingRequest,
  showVenueForSession,
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
    [MESSAGE_TYPES.BADGE]: () => (
      <Badge
        u={u}
        openQr={openQr}
      />
    ),
    [MESSAGE_TYPES.BINGO]: () => (
      <BingoCard
        people={people}
        verifyBingoCode={verifyBingoCode}
      />
    ),
    [MESSAGE_TYPES.SUGGESTIONS]: () => (
      <SuggestionsView people={people} u={u} connect={connect} />
    ),
    [MESSAGE_TYPES.MAGIC_LINK]: () => (
      <MagicLinkView
        email={m.email}
        token={m.token}
        verifyMagicLink={verifyMagicLink}
      />
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
        focusMode={m.focusMode}
        selectedTracks={selectedTracks}
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
      <ConnectionsView
        connections={connections}
        people={people}
        byId={byId}
        cmd={cmd}
      />
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
      <OutgoingView
        connections={connections}
        people={people}
        byId={byId}
        abortOutgoingRequest={abortOutgoingRequest}
      />
    ),
    [MESSAGE_TYPES.CHAT]: () => <ChatView p={m.p} />,
    [MESSAGE_TYPES.CONTACT]: () => (
      <ContactView label={m.label} value={m.value} />
    ),
[MESSAGE_TYPES.REMINDER]: () => (
  <ReminderView
    sessions={sessions}
    myAgenda={Object.keys(selectedTracks || {})}
    isRegistered={!isGuest(u)}
    showVenueForSession={showVenueForSession}
  />
),
    [MESSAGE_TYPES.WIFI]: () => <WiFiView />,
    [MESSAGE_TYPES.TRAVEL]: () => <TravelView />,
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
  const [showBadgeFullscreen, setShowBadgeFullscreen] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [badgeQrValue, SetBadgeQrValue] = useState("");
  const [connections, setConnections] = useState({
    accepted: [],
    incoming: [],
    outgoing: [],
  });
  const [day, setDay] = useState(currentConferenceDate);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);

  const [selectedTracks, setSelectedTracks] = useLocalStorage(
    STORAGE_KEYS.SELECTED_TRACKS,
    {}
  );
  const [checkedInSessions, setCheckedInSessions] = useLocalStorage(
    STORAGE_KEYS.CHECKED_IN_SESSIONS,
    {}
  );

  const ref = useRef(null);

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

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

  // ========================================================================
  // MESSAGE HELPERS
  // ========================================================================

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

  // ========================================================================
  // AUTHENTICATION & REGISTRATION
  // ========================================================================

  async function verifyMagicLink(token) {
    if (!pendingRegistration) {
      say(MESSAGE_TYPES.TEXT, "No pending registration found. Please register again.");
      return;
    }

    if (pendingRegistration.token !== token) {
      say(MESSAGE_TYPES.TEXT, "Invalid verification link. Please request a new one.");
      return;
    }

    const isExpired =
      new Date(pendingRegistration.expiresAt).getTime() < Date.now();

    if (isExpired) {
      setPendingRegistration(null);
      say(MESSAGE_TYPES.TEXT, "This verification link has expired. Please register again.");
      return;
    }

    try {
      const result = await attendeeService.register(pendingRegistration.form);
      result.person.badgeCode = generateBadgeCode();
      setPeople(await attendeeService.getAll());
      setU(result.person);
      setProfileMenuOpen(false);
      setPendingRegistration(null);

      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_USER,
        JSON.stringify(result.person)
      );

      say(
        MESSAGE_TYPES.TEXT,
        result.vendor
          ? `Verification successful. Welcome ${result.person.name}. MEGAN recognized ${result.vendor.name}. Your profile was saved.`
          : `Verification successful. Welcome ${result.person.name}. Your profile was saved. Registered Mode is now active.`
      );

      scrollToBottom();
    } catch (error) {
      console.error("Magic link verification error:", error);
      say(MESSAGE_TYPES.TEXT, "Verification failed. Please try again.");
    }
  }

  async function register(form) {
    const token = crypto.randomUUID();

    const pending = {
      form,
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    setPendingRegistration(pending);

    say(MESSAGE_TYPES.MAGIC_LINK, "", {
      token,
      email: form.email,
    });

    scrollToBottom();
  }

  // ========================================================================
  // BINGO VERIFICATION
  // ========================================================================

  function verifyBingoCode(code, challengeType, callback) {
    const person = people.find(
      (p) =>
        p.badgeCode &&
        p.badgeCode.toUpperCase() === code.toUpperCase()
    );

    if (!person) {
      say(MESSAGE_TYPES.TEXT, "❌ Invalid Badge Code. Please try again.");
      callback?.(false);
      return;
    }

    // Validate challenge type
    let isValid = false;
    let message = "";

    if (challengeType === "speaker" && person.role === "Speaker") {
      isValid = true;
      message = "✅ Bingo: Connected with a Speaker!";
    } else if (challengeType === "virtual" && person.attendance === "Virtual") {
      isValid = true;
      message = "✅ Bingo: Connected with a Virtual Attendee!";
    } else if (challengeType === "petOwner" && person.bingoFacts?.includes("Pet Owner")) {
      isValid = true;
      message = "✅ Bingo: Found a Pet Owner!";
    } else if (challengeType === "languages" && person.languages?.length >= 3) {
      isValid = true;
      message = "✅ Bingo: Found a Polyglot!";
    } else {
      message = `❌ ${person.name} doesn't match this challenge. Try another code!`;
    }

    say(MESSAGE_TYPES.TEXT, message);
    callback?.(isValid);
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  function abortOutgoingRequest(personId) {
    setConnections((prev) => ({
      ...prev,
      outgoing: prev.outgoing.filter((x) => x.personId !== personId),
    }));

    say(MESSAGE_TYPES.TEXT, "Pending connection request was withdrawn.");
    scrollToBottom();
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================
function getSelectedSessionIds(selectedTracks) {
  return Object.values(selectedTracks || {}).filter(Boolean);
}

function isSessionSelected(sessionId, selectedTracks) {
  return getSelectedSessionIds(selectedTracks).includes(sessionId);
}
function selectTrackForGroup(groupKey, sessionId) {
  setSelectedTracks((prev) => {
    const next = { ...(prev || {}) };

    if (next[sessionId]) {
      delete next[sessionId];
    } else {
      next[sessionId] = true;
    }

    return next;
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

  function showVenueForSession(sessionId) {
    say(MESSAGE_TYPES.VENUE, "", {
      focusSessionId: sessionId,
      focusMode: "next",
    });

    scrollToBottom();
  }

  // ========================================================================
  // SIGN OUT
  // ========================================================================

  function requestSignOut() {
    say(MESSAGE_TYPES.CONFIRM_SIGNOUT);

    setTimeout(() => {
      ref.current?.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
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

  function toggleAttendance() {
  setU((prev) => {
    const nextAttendance =
      prev.attendance === "Onsite"
        ? "Virtual"
        : prev.attendance === "Virtual"
        ? "Not Attending"
        : "Onsite";

    const updatedUser = {
      ...prev,
      attendance: nextAttendance,
    };

    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_USER,
      JSON.stringify(updatedUser)
    );

    return updatedUser;
  });
}

  // ========================================================================
  // COMMAND ROUTING
  // ========================================================================

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
    } else if (l.includes("bingo")) {
      !isGuest(u) ? say(MESSAGE_TYPES.BINGO) : need("Bingo");
    } else if (
      vendor &&
      (l.includes("connect me with") || l.includes("connect me to"))
    ) {
      !isGuest(u)
        ? say(MESSAGE_TYPES.VENDOR, "", { vendorId: vendor.id })
        : need("Connect Me");
    } else if (l.includes("show badge code") && person) {
      say(MESSAGE_TYPES.CONTACT, "", {
        label: `${person.name}'s Bingo Code`,
        value: person.badgeCode || "Not available",
      });
    } else if (l.includes("badge")) {
      !isGuest(u) ? say(MESSAGE_TYPES.BADGE) : need("Badge");
    } else if (l.includes("my connections")) {
      !isGuest(u)
        ? say(MESSAGE_TYPES.CONNECTIONS)
        : need("connections");
    } else if (l.includes("show next venue")) {
      say(MESSAGE_TYPES.VENUE, "", {
        focusSessionId: "SESSION_ID_HERE",
        focusMode: "next",
      });
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
    } else if (
      l.includes("travel") ||
      l.includes("hotel") ||
      l.includes("parking") ||
      l.includes("airport")
    ) {
      say(MESSAGE_TYPES.TRAVEL);
    } else {
      say(
        MESSAGE_TYPES.TEXT,
        "Try Register, Agenda, My Day, Badge, Bingo, Connect me, or Connect me with Microsoft."
      );
    }

    setInput("");
    scrollToBottom();
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!ready) return <div className="loading">Loading MEGAN…</div>;

  const currentDate = currentConferenceDate;
 const currentTime = event?.current?.slice(11, 16) || "00:00";
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
        "Show venue map",
        "Show Bingo",
        "Show my connections",
        "Connect me",
      ]
    : ["Register", "Show travel", "Show venue map", "Show WiFi", "Show agenda"];

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
              onClick={() => {
                if (isGuest(u)) {
                  say(MESSAGE_TYPES.REGISTER);
                  scrollToBottom();
                } else {
                  setProfileMenuOpen(!profileMenuOpen);
                }
              }}
            >
              {isGuest(u) ? "Not registered yet" : u.name}
            </button>
            {!isGuest(u) && profileMenuOpen && (
              <div className="profile-menu">
                <button onClick={requestSignOut}>Sign Out</button>
              </div>
            )}
           <span>
  {isGuest(u) ? (
    "Guest"
  ) : (
    <>
<button
  className="notification-pill"
  onClick={toggleAttendance}
>
  {u.attendance === "Onsite" && "🏢 Onsite"}
  {u.attendance === "Virtual" && "💻 Virtual"}
  {u.attendance === "Not Attending" && "❌ Away"}
</button>
      {" • "}
      <button
        className="notification-pill"
        onClick={() => cmd("reminder")}
      >
        🔔 1
      </button>
    </>
  )}
</span>
            {!isGuest(u) && (
              <small>
                <button onClick={() => cmd("show my connections")}>
                  🤝{connections.accepted.length}
                </button>{" "}
                •{" "}
                <button onClick={() => cmd("show incoming requests")}>
                  🔽{connections.incoming.length}
                </button>{" "}
                •{" "}
                <button onClick={() => cmd("show outgoing requests")}>
                  🔼{connections.outgoing.length}
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
                  verifyBingoCode={verifyBingoCode}
                  vendors={vendors}
                  confirmSignOut={confirmSignOut}
                  cancelSignOut={cancelSignOut}
                  selectedTracks={selectedTracks}
                  selectTrackForGroup={selectTrackForGroup}
                  checkedInSessions={checkedInSessions}
                  checkInToSession={checkInToSession}
                  verifyMagicLink={verifyMagicLink}
                  showVenueForSession={showVenueForSession}
                  abortOutgoingRequest={abortOutgoingRequest}
                  checkOutFromSession={checkOutFromSession}
                  openQr={(qrValue) => {
                    SetBadgeQrValue(qrValue);
                    setShowBadgeFullscreen(true);
                  }}
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
        {showBadgeFullscreen && (
          <div
            className="badge-modal"
            onClick={() => setShowBadgeFullscreen(false)}
          >
            <button
              className="badge-modal-close"
              onClick={() => setShowBadgeFullscreen(false)}
            >
              ✕
            </button>

            <div
              className="badge-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <QRCodeCanvas
                value={badgeQrValue}
                size={320}
                level="H"
                includeMargin
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);