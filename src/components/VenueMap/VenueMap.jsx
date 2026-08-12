import { useEffect, useMemo, useRef, useState } from "react";
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

const ZOOM_LEVELS = {
  MIN: 0.1,
  MAX: 3,
  STEP: 0.1,
  DEFAULT: 1.0,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function combineDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function enrichSession(session) {
  return {
    ...session,
    startsAt: combineDateTime(session.date, session.start),
    endsAt: combineDateTime(session.date, session.end),
  };
}

function getSessionsForRoom(allSessions, room) {
  if (!room) return [];
  const roomName = normalizeText(room.name);
  const roomAliases = (room.aliases || []).map(normalizeText);

  return allSessions.filter((session) => {
    const sessionRoom = normalizeText(session.room);
    return (
      sessionRoom === roomName || roomAliases.includes(sessionRoom)
    );
  });
}

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

function getSessionGroupKey(session) {
  if (!session) return null;
  return `${session.date}-${session.start}`;
}

function getSelectedSessionIds(selectedTracks = {}) {
  if (Array.isArray(selectedTracks)) {
    return selectedTracks;
  }

  if (!selectedTracks || typeof selectedTracks !== "object") {
    return [];
  }

  return Object.entries(selectedTracks)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => (value === true ? key : value));
}

function getSelectedOrAllSessions(candidateSessions, selectedTracks = {}) {
  if (!candidateSessions || candidateSessions.length === 0) {
    return [];
  }

  // ✅ If selectedTracks is empty, return all candidates
  if (!selectedTracks || Object.keys(selectedTracks).length === 0) {
    return candidateSessions;
  }

  const selectedSessionIds = getSelectedSessionIds(selectedTracks);
  const selectedIdSet = new Set(selectedSessionIds);

  const selectedSessions = candidateSessions.filter((session) =>
    selectedIdSet.has(session.id)
  );

  // ✅ If no matches found, return all candidates (fallback)
  return selectedSessions.length > 0 ? selectedSessions : candidateSessions;
}

function getSelectedSessionForGroup(candidateSessions, selectedTracks) {
  if (!candidateSessions || candidateSessions.length === 0) return null;

  const firstSession = candidateSessions[0];
  const groupKey = getSessionGroupKey(firstSession);
  const selectedSessionId = selectedTracks?.[groupKey];

  if (selectedSessionId) {
    const selectedSession = candidateSessions.find(
      (session) => session.id === selectedSessionId
    );
    if (selectedSession) return selectedSession;
  }

  return candidateSessions[0];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function VenueMap({
  user,
  sessions = [],
  now,
  focusSessionId,
  selectedTracks = {},
  onCheckIn,
}) {
  // ============================
  // STATE & REFS
  // ============================

  const isGuestUser = !user || user.id === "guest";

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const mapScrollRef = useRef(null);
  const [checkedInSessionIds, setCheckedInSessionIds] = useState([]);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showNext, setShowNext] = useState(false);
  const [filterMode, setFilterMode] = useState("or"); // ✅ NEW: "and" or "or"
  const [showToilets, setShowToilets] = useState(false);
  const [showElevators, setShowElevators] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_LEVELS.DEFAULT);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ============================
  // MEMOIZED COMPUTATIONS
  // ============================

  const enrichedSessions = useMemo(() => {
    return sessions
      .map(enrichSession)
      .sort((a, b) => a.startsAt - b.startsAt);
  }, [sessions]);

  const schedulesByRoomId = useMemo(() => {
    return Object.fromEntries(
      rooms.map((room) => [
        room.id,
        getRoomSchedule(room, sessions, user, now),
      ])
    );
  }, [sessions, user, now]);

  const focusedSession = useMemo(() => {
    return focusSessionId
      ? enrichedSessions.find((session) => session.id === focusSessionId)
      : null;
  }, [focusSessionId, enrichedSessions]);

  const focusedRoom = useMemo(() => {
    return getRoomForSession(focusedSession, rooms);
  }, [focusedSession]);

  // Get current sessions (respecting selectedTracks)
  const myCurrentSessions = useMemo(() => {
    const currentSessions = enrichedSessions.filter(
      (session) => session.startsAt <= now && session.endsAt > now
    );
    return getSelectedOrAllSessions(currentSessions, selectedTracks);
  }, [enrichedSessions, now, selectedTracks]);

  // Get next sessions (respecting selectedTracks)
  const myNextSessions = useMemo(() => {
    const futureSessions = enrichedSessions.filter(
      (session) => session.startsAt > now
    );

    if (futureSessions.length === 0) return [];

    const nextStartDate = futureSessions[0].date;
    const nextStartTime = futureSessions[0].start;

    const nextSessionsAtSameTime = futureSessions.filter(
      (session) =>
        session.date === nextStartDate && session.start === nextStartTime
    );

    return getSelectedOrAllSessions(nextSessionsAtSameTime, selectedTracks);
  }, [enrichedSessions, now, selectedTracks]);

  // Get rooms for current sessions
  const myCurrentRooms = useMemo(() => {
    return myCurrentSessions
      .map((session) => getRoomForSession(session, rooms))
      .filter(Boolean);
  }, [myCurrentSessions]);

  // Get rooms for next sessions
  const myNextRooms = useMemo(() => {
    return myNextSessions
      .map((session) => getRoomForSession(session, rooms))
      .filter(Boolean);
  }, [myNextSessions]);

  // Room IDs for current sessions
  const myCurrentRoomIds = useMemo(() => {
    return new Set(myCurrentRooms.map((room) => room.id));
  }, [myCurrentRooms]);

  // Room IDs for next sessions
  const myNextRoomIds = useMemo(() => {
    return new Set(myNextRooms.map((room) => room.id));
  }, [myNextRooms]);

  const guestCurrentRoom = useMemo(() => {
    return rooms.find((room) => schedulesByRoomId[room.id]?.current);
  }, [schedulesByRoomId]);

  const guestSoonRoom = useMemo(() => {
    return rooms.find((room) => schedulesByRoomId[room.id]?.startingSoon);
  }, [schedulesByRoomId]);

  const selectedSchedule = useMemo(() => {
    if (selectedRoomId) {
      return schedulesByRoomId[selectedRoomId];
    }

    // Fallback selection logic
    if (isGuestUser) {
      return (
        schedulesByRoomId[guestCurrentRoom?.id] ||
        schedulesByRoomId[guestSoonRoom?.id] ||
        schedulesByRoomId[rooms[0]?.id]
      );
    }

    const currentRoomId = myCurrentRooms[0]?.id;
    const nextRoomId = myNextRooms[0]?.id;

    return (
      schedulesByRoomId[currentRoomId] ||
      schedulesByRoomId[nextRoomId] ||
      schedulesByRoomId[rooms[0]?.id]
    );
  }, [
    selectedRoomId,
    schedulesByRoomId,
    isGuestUser,
    guestCurrentRoom,
    guestSoonRoom,
    myCurrentRooms,
    myNextRooms,
  ]);

  const selectedRoom = selectedSchedule?.room;

  // ✅ FIXED: Filter visible rooms based on toggle buttons AND selected sessions
  const visibleRooms = useMemo(() => {
    return rooms.filter((room) => {
      const isToilet = room.type === MARKER_TYPES.RESTROOM;
      const isElevator = room.type === MARKER_TYPES.ELEVATOR;

      // Always show toilets and elevators if toggled
      if (showToilets && isToilet) return true;
      if (showElevators && isElevator) return true;

      const isCurrentRoom = myCurrentRoomIds.has(room.id);
      const isNextRoom = myNextRoomIds.has(room.id);

      // ✅ NEW: AND/OR logic
      if (filterMode === "and") {
        // Both Current AND Next must be enabled, and room must be in both
        if (showCurrent && showNext) {
          return isCurrentRoom && isNextRoom;
        }
        // Only one is enabled, show that one
        if (showCurrent) return isCurrentRoom;
        if (showNext) return isNextRoom;
        return false;
      }

      // OR mode (default): Show if in either current or next
      return (
        (showCurrent && isCurrentRoom) ||
        (showNext && isNextRoom)
      );
    });
  }, [
    myCurrentRoomIds,
    myNextRoomIds,
    showCurrent,
    showNext,
    filterMode, // ✅ NEW dependency
    showToilets,
    showElevators,
  ]);

  // ============================
  // EFFECTS
  // ============================

  // Center map on selected room
  useEffect(() => {
    if (!mapScrollRef.current || !selectedRoom?.mapPosition) return;

    const wrapper = mapScrollRef.current;
    const stageWidth = wrapper.scrollWidth;
    const stageHeight = wrapper.scrollHeight;
    const targetX = (selectedRoom.mapPosition.x / 100) * stageWidth;
    const targetY = (selectedRoom.mapPosition.y / 100) * stageHeight;

    wrapper.scrollTo({
      left: Math.max(targetX - wrapper.clientWidth / 2, 0),
      top: Math.max(targetY - wrapper.clientHeight / 2, 0),
      behavior: "smooth",
    });
  }, [selectedRoom]);

  // Auto-select room based on context
  useEffect(() => {
    if (selectedRoomId) return;

    if (focusedRoom) {
      setSelectedRoomId(focusedRoom.id);
      return;
    }

    if (isGuestUser) {
      if (guestCurrentRoom) {
        setSelectedRoomId(guestCurrentRoom.id);
        return;
      }
      if (guestSoonRoom) {
        setSelectedRoomId(guestSoonRoom.id);
        return;
      }
    } else {
      if (myCurrentRooms[0]) {
        setSelectedRoomId(myCurrentRooms[0].id);
        return;
      }
      if (myNextRooms[0]) {
        setSelectedRoomId(myNextRooms[0].id);
        return;
      }
    }
  }, [
    selectedRoomId,
    focusedRoom,
    isGuestUser,
    guestCurrentRoom,
    guestSoonRoom,
    myCurrentRooms,
    myNextRooms,
  ]);

  // ============================
  // EVENT HANDLERS
  // ============================

  const selectRoom = (roomId) => {
    setSelectedRoomId(roomId);
  };

  const checkIn = (session) => {
    if (!session) return;
    setCheckedInSessionIds((current) =>
      current.includes(session.id) ? current : [...current, session.id]
    );
    if (onCheckIn) onCheckIn(session, selectedRoom);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_LEVELS.STEP, ZOOM_LEVELS.MAX));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_LEVELS.STEP, ZOOM_LEVELS.MIN));
  };

  const handleResetZoom = () => {
    setZoom(ZOOM_LEVELS.DEFAULT);
    setPanX(0);
    setPanY(0);
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setZoom((prev) =>
      Math.max(
        ZOOM_LEVELS.MIN,
        Math.min(ZOOM_LEVELS.MAX, prev + delta * ZOOM_LEVELS.STEP)
      )
    );
  };

  const handlePanStart = (e) => {
    if (e.button !== 2 && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePanMove = (e) => {
    if (!isPanning) return;
    setPanX(e.clientX - panStart.x);
    setPanY(e.clientY - panStart.y);
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // ============================
  // STYLING HELPERS
  // ============================

  const getMarkerStatusClass = (room) => {
    if (focusedRoom && room.id === focusedRoom.id) {
      return MARKER_STATUS.FOCUSED;
    }

    if (isGuestUser) {
      const schedule = schedulesByRoomId[room.id];
      if (schedule?.current) return MARKER_STATUS.LIVE;
      if (schedule?.startingSoon) return MARKER_STATUS.SOON;
      return MARKER_STATUS.INACTIVE;
    }

    if (myCurrentRoomIds.has(room.id)) return MARKER_STATUS.MY_CURRENT;
    if (myNextRoomIds.has(room.id)) return MARKER_STATUS.MY_NEXT;
    return MARKER_STATUS.INACTIVE;
  };

  const getRoomBadge = (roomId) => {
    if (focusedRoom && roomId === focusedRoom.id) return "HERE";

    if (isGuestUser) {
      const schedule = schedulesByRoomId[roomId];
      if (schedule?.current) return "NOW";
      if (schedule?.startingSoon) return "NEXT";
      return "";
    }

    if (myCurrentRoomIds.has(roomId)) return "CURRENT";
    if (myNextRoomIds.has(roomId)) return "NEXT";
    return "";
  };

  const getMarkerIcon = (room) => {
    if (room.type === MARKER_TYPES.RESTROOM) return "WC";
    if (room.type === MARKER_TYPES.ELEVATOR) return "↕";
    return "";
  };

  const getRoomMarkerClass = (room) => {
    const statusClass = getMarkerStatusClass(room);
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
  };


  // ============================
  // RENDER
  // ============================

return (
    <div className="venue-map-shell">
      <section className="venue-map-card" aria-label="Conference venue map">
        {/* Top Bar */}
        <div className="venue-map-topbar">
          <h4>Venue Map</h4>
          <div className="venue-map-zoom-controls">
            <button
              className="zoom-button"
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_LEVELS.MIN}
              title="Zoom Out (Ctrl + Scroll)"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button
              className="zoom-button"
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_LEVELS.MAX}
              title="Zoom In (Ctrl + Scroll)"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              className="zoom-button reset"
              onClick={handleResetZoom}
              title="Reset Zoom"
              aria-label="Reset zoom and pan"
            >
              ⟲
            </button>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="venue-map-toggle-legend">
          <button
            className={showCurrent ? "active" : ""}
            onClick={() => setShowCurrent(!showCurrent)}
            aria-pressed={showCurrent}
          >
            Current
          </button>
          <button
            className={showNext ? "active" : ""}
            onClick={() => setShowNext(!showNext)}
            aria-pressed={showNext}
          >
            Next
          </button>
          <button
            className={showToilets ? "active" : ""}
            onClick={() => setShowToilets(!showToilets)}
            aria-pressed={showToilets}
          >
            WC
          </button>
          <button
            className={showElevators ? "active" : ""}
            onClick={() => setShowElevators(!showElevators)}
            aria-pressed={showElevators}
          >
            Elevator
          </button>
        </div>

        {/* Map Image with Markers */}
        <div
          ref={mapScrollRef}
          className="venue-map-image-wrap"
          aria-label="Interactive Conference Venue Map"
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="venue-map-image-stage"
            style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              transformOrigin: "0 0",
              transition: isPanning ? "none" : "transform 0.2s ease",
            }}
          >
            {/* Floorplan Image */}
            <img
              src={FLOORPLAN_IMAGE}
              alt="Venue floor plan"
              className="venue-map-image"
              draggable={false}
            />

            {/* Markers */}
            {visibleRooms.map((room) => {
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
                    <span className="venue-map-marker-dot">{icon}</span>
                  )}
                  {badge && (
                    <span className="venue-map-marker-badge">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}