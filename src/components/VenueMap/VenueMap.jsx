import { useEffect, useMemo, useState } from "react";
import "./VenueMap.css";
import { rooms } from "../../data/rooms.js";
import FLOORPLAN_IMAGE from "../../components/VenueMap/venue-map.png";

// ============================================================================
// CONSTANTS
// ============================================================================

const SOON_MINUTES = 15;
const MARKER_TYPES = {
  RESTROOM: "restroom",
  ELEVATOR: "elevator",
  ENTRANCE: "entrance",
  OUTDOOR: "outdoor-area",
};

const ROOM_STATUS = {
  INACTIVE: "room-inactive",
  LIVE: "room-live",
  SOON: "room-soon",
  MY_CURRENT: "room-my-current",
  MY_NEXT: "room-my-next",
  FOCUSED: "room-focused",
};

const MARKER_STATUS = {
  INACTIVE: "marker-inactive",
  LIVE: "marker-live",
  SOON: "marker-soon",
  MY_CURRENT: "marker-my-current",
  MY_NEXT: "marker-my-next",
  FOCUSED: "marker-focused",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Combines date and time strings into a Date object
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 * @returns {Date}
 */
function combineDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

/**
 * Formats a Date object to HH:MM format
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Normalizes text for comparison (lowercase, trimmed)
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

/**
 * Enriches a session with computed start/end times
 * @param {Object} session
 * @returns {Object}
 */
function enrichSession(session) {
  return {
    ...session,
    startsAt: combineDateTime(session.date, session.start),
    endsAt: combineDateTime(session.date, session.end),
  };
}

/**
 * Finds all sessions scheduled in a specific room
 * @param {Array} allSessions
 * @param {Object} room
 * @returns {Array}
 */
function getSessionsForRoom(allSessions, room) {
  if (!room) return [];

  return allSessions.filter((session) => {
    const sessionRoom = normalizeText(session.room);
    const roomName = normalizeText(room.name);
    const roomAliases = (room.aliases || []).map(normalizeText);

    return (
      sessionRoom === roomName || roomAliases.includes(sessionRoom)
    );
  });
}

/**
 * Finds the room for a given session
 * @param {Object} session
 * @param {Array} allRooms
 * @returns {Object|null}
 */
function getRoomForSession(session, allRooms) {
  if (!session) return null;

  const sessionRoom = normalizeText(session.room);

  return allRooms.find((room) => {
    const roomName = normalizeText(room.name);
    const roomAliases = (room.aliases || []).map(normalizeText);

    return (
      sessionRoom === roomName || roomAliases.includes(sessionRoom)
    );
  });
}

/**
 * Computes the schedule and status for a room
 * @param {Object} room
 * @param {Array} allSessions
 * @param {Object} user
 * @param {Date} now
 * @returns {Object}
 */
function getRoomSchedule(room, allSessions, user, now) {
  const roomSessions = getSessionsForRoom(allSessions, room)
    .map(enrichSession)
    .sort((a, b) => a.startsAt - b.startsAt);

  const current =
    roomSessions.find(
      (session) => session.startsAt <= now && session.endsAt > now
    ) || null;

  const next =
    roomSessions.find((session) => session.startsAt > now) || null;

  const minutesUntilNext = next
    ? Math.round((next.startsAt - now) / 60000)
    : null;

  const startingSoon =
    !current &&
    next &&
    minutesUntilNext >= 0 &&
    minutesUntilNext <= SOON_MINUTES;

  return {
    room,
    sessions: roomSessions,
    current,
    next,
    minutesUntilNext,
    startingSoon,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function VenueMap({
  user,
  sessions = [],
  now,
  focusSessionId,
  onCheckIn,
}) {
  // ========================================================================
  // STATE
  // ========================================================================

  const isGuestUser = !user || user.id === "guest";
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [checkedInSessionIds, setCheckedInSessionIds] = useState([]);
  const [personalView, setPersonalView] = useState("current");

  // ========================================================================
  // MEMOIZED COMPUTATIONS
  // ========================================================================

  /**
   * Compute schedules for all rooms
   */
  const schedulesByRoomId = useMemo(() => {
    return Object.fromEntries(
      rooms.map((room) => [
        room.id,
        getRoomSchedule(room, sessions, user, now),
      ])
    );
  }, [sessions, user, now]);

  /**
   * Enrich and sort all sessions
   */
  const enrichedSessions = useMemo(() => {
    return sessions
      .map(enrichSession)
      .sort((a, b) => a.startsAt - b.startsAt);
  }, [sessions]);

  /**
   * Get the focused session (if any)
   */
  const focusedSession = useMemo(() => {
    return focusSessionId
      ? enrichedSessions.find((session) => session.id === focusSessionId)
      : null;
  }, [focusSessionId, enrichedSessions]);

  /**
   * Get the room for the focused session
   */
  const focusedRoom = useMemo(() => {
    return getRoomForSession(focusedSession, rooms);
  }, [focusedSession]);

  /**
   * Get user's current and next sessions
   */
  const myCurrentSession = useMemo(() => {
    return enrichedSessions.find(
      (session) => session.startsAt <= now && session.endsAt > now
    ) || null;
  }, [enrichedSessions, now]);

  const myNextSession = useMemo(() => {
    return enrichedSessions.find((session) => session.startsAt > now) || null;
  }, [enrichedSessions, now]);

  /**
   * Get rooms for user's sessions
   */
  const myCurrentRoom = useMemo(() => {
    return getRoomForSession(myCurrentSession, rooms);
  }, [myCurrentSession]);

  const myNextRoom = useMemo(() => {
    return getRoomForSession(myNextSession, rooms);
  }, [myNextSession]);

  /**
   * Get guest view rooms (current/soon)
   */
  const guestCurrentRoom = useMemo(() => {
    return rooms.find((room) => schedulesByRoomId[room.id]?.current);
  }, [schedulesByRoomId]);

  const guestSoonRoom = useMemo(() => {
    return rooms.find((room) => schedulesByRoomId[room.id]?.startingSoon);
  }, [schedulesByRoomId]);

  /**
   * Get the selected room's schedule
   */
  const selectedSchedule = useMemo(() => {
    if (selectedRoomId) {
      return schedulesByRoomId[selectedRoomId];
    }

    // Fallback to auto-selected room
    const fallbackRoomId = isGuestUser
      ? guestCurrentRoom?.id || guestSoonRoom?.id
      : myCurrentRoom?.id || myNextRoom?.id;

    return schedulesByRoomId[fallbackRoomId] || schedulesByRoomId[rooms[0].id];
  }, [
    selectedRoomId,
    schedulesByRoomId,
    isGuestUser,
    guestCurrentRoom,
    guestSoonRoom,
    myCurrentRoom,
    myNextRoom,
  ]);

  const selectedRoom = selectedSchedule?.room;

  // ========================================================================
  // EFFECTS
  // ========================================================================

  /**
   * Auto-select room based on context
   */
  useEffect(() => {
    // If a room is already selected, don't change it
    if (selectedRoomId) return;

    // Prioritize focused room
    if (focusedRoom) {
      setSelectedRoomId(focusedRoom.id);
      return;
    }

    // For guests: current > soon
    if (isGuestUser) {
      if (guestCurrentRoom) {
        setSelectedRoomId(guestCurrentRoom.id);
        return;
      }

      if (guestSoonRoom) {
        setSelectedRoomId(guestSoonRoom.id);
        return;
      }
    }

    // For users: current > next
    if (myCurrentRoom) {
      setSelectedRoomId(myCurrentRoom.id);
      return;
    }

    if (myNextRoom) {
      setSelectedRoomId(myNextRoom.id);
    }
  }, [
    selectedRoomId,
    focusedRoom,
    isGuestUser,
    guestCurrentRoom,
    guestSoonRoom,
    myCurrentRoom,
    myNextRoom,
  ]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle room selection
   */
  function selectRoom(roomId) {
    setSelectedRoomId(roomId);
  }

  /**
   * Handle session check-in
   */
  function checkIn(session) {
    if (!session) return;

    setCheckedInSessionIds((current) =>
      current.includes(session.id)
        ? current
        : [...current, session.id]
    );

    if (onCheckIn) {
      onCheckIn(session, selectedRoom);
    }
  }

  /**
   * Handle personal view toggle
   */
  function togglePersonalView(view) {
    setPersonalView(view);

    const targetRoom =
      view === "current" ? myCurrentRoom : myNextRoom;

    if (targetRoom) {
      setSelectedRoomId(targetRoom.id);
    }
  }

  // ========================================================================
  // STYLING HELPERS
  // ========================================================================

  /**
   * Determine CSS classes for a room element
   */
  function getRoomClass(room) {
    let statusClass = ROOM_STATUS.INACTIVE;

    if (focusedRoom && room.id === focusedRoom.id) {
      statusClass = ROOM_STATUS.FOCUSED;
    } else if (isGuestUser) {
      const schedule = schedulesByRoomId[room.id];
      if (schedule?.current) {
        statusClass = ROOM_STATUS.LIVE;
      } else if (schedule?.startingSoon) {
        statusClass = ROOM_STATUS.SOON;
      }
    } else {
      if (room.id === myCurrentRoom?.id) {
        statusClass = ROOM_STATUS.MY_CURRENT;
      } else if (room.id === myNextRoom?.id) {
        statusClass = ROOM_STATUS.MY_NEXT;
      }
    }

    return [
      "venue-room",
      statusClass,
      selectedRoomId === room.id ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Determine badge text for a room marker
   */
  function getRoomBadge(roomId) {
    const schedule = schedulesByRoomId[roomId];

    if (focusedRoom && roomId === focusedRoom.id) {
      return "HERE";
    }

    if (isGuestUser) {
      if (schedule?.current) return "NOW";
      if (schedule?.startingSoon) return "15 MIN";
      return "";
    }

    if (roomId === myCurrentRoom?.id) return "CURRENT";
    if (roomId === myNextRoom?.id) return "NEXT";

    return "";
  }

  /**
   * Determine CSS classes for a room marker
   */
  function getRoomMarkerClass(room) {
    const schedule = schedulesByRoomId[room.id];
    let statusClass = MARKER_STATUS.INACTIVE;

    if (focusedRoom && room.id === focusedRoom.id) {
      statusClass = MARKER_STATUS.FOCUSED;
    } else if (isGuestUser) {
      if (schedule?.current) {
        statusClass = MARKER_STATUS.LIVE;
      } else if (schedule?.startingSoon) {
        statusClass = MARKER_STATUS.SOON;
      }
    } else {
      if (room.id === myCurrentRoom?.id) {
        statusClass = MARKER_STATUS.MY_CURRENT;
      } else if (room.id === myNextRoom?.id) {
        statusClass = MARKER_STATUS.MY_NEXT;
      }
    }

    const typeClass =
      room.type === MARKER_TYPES.RESTROOM
        ? "marker-restroom"
        : room.type === MARKER_TYPES.ELEVATOR
        ? "marker-elevator"
        : "";

    return [
      "venue-map-marker",
      statusClass,
      typeClass,
      selectedRoomId === room.id ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Get marker icon for a room
   */
  function getMarkerIcon(room) {
    switch (room.type) {
      case MARKER_TYPES.RESTROOM:
        return "WC";
      case MARKER_TYPES.ELEVATOR:
        return "↕";
      default:
        return "";
    }
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="venue-map-shell">
      <section
        className="venue-map-card"
        aria-label="Conference venue map"
      >
        {/* Map Image with Interactive Markers */}
        <div
          className="venue-map-image-wrap"
          aria-label="Interactive Conference Venue Map"
        >
          <img
            src={FLOORPLAN_IMAGE}
            alt="Venue floor plan"
            className="venue-map-image"
          />

          {/* Room Markers */}
          {rooms
            .filter((room) => room.mapPosition)
            .map((room) => {
              const badge = getRoomBadge(room.id);
              const icon = getMarkerIcon(room);

              return (
                <button
                  key={room.id}
                  type="button"
                  className={getRoomMarkerClass(room)}
                  style={{
                    left: `${room.mapPosition.x}%`,
                    top: `${room.mapPosition.y}%`,
                  }}
                  title={room.name}
                  aria-label={`${room.name}${badge ? ` - ${badge}` : ""}`}
                  onClick={() => selectRoom(room.id)}
                >
                  {icon && (
                    <span className="venue-map-marker-dot">
                      {icon}
                    </span>
                  )}

                  {badge && (
                    <span className="venue-map-marker-badge">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* Legend / View Toggle */}
        <div className="venue-legend" aria-label="Map legend">
          {isGuestUser ? (
            <div className="venue-legend-items">
              <span className="venue-legend-item">
                <span className="venue-dot venue-d-live" />
                Now
              </span>

              <span className="venue-legend-item">
                <span className="venue-dot venue-d-soon" />
                Starts within 15 min
              </span>
            </div>
          ) : (
            <div className="venue-view-toggle">
              <button
                className={`toggle-button ${
                  personalView === "current" ? "active" : ""
                }`}
                onClick={() => togglePersonalView("current")}
                aria-pressed={personalView === "current"}
              >
                Current
              </button>

              <button
                className={`toggle-button ${
                  personalView === "next" ? "active" : ""
                }`}
                onClick={() => togglePersonalView("next")}
                aria-pressed={personalView === "next"}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}