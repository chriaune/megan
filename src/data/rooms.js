import venueMapImage from "../components/VenueMap/venue-map.png";

export const venueMap = {
  image: venueMapImage,
  name: "Conference Center Venue Map",
  levels: ["Lower Level", "Main Level", "2nd Level"],
};

export const rooms = [
  // =========================
  // LOWER LEVEL
  // =========================

  {
    id: "lower-garden-marquee",
    name: "Garden Marquee",
    level: "Lower Level",
    type: "ballroom",
    area: "Garden / Terrace Grounds",
    description: "Large event space on the Lower Level near the Terrace Grounds.",
    aliases: ["garden marquee", "marquee", "garden"],
    mapPosition: { x: 17.9, y: 18.0 },
  },

  {
    id: "lower-terrace-grounds",
    name: "Terrace Grounds",
    level: "Lower Level",
    type: "outdoor-area",
    area: "Garden / Terrace Grounds",
    description: "Outdoor terrace area on the Lower Level.",
    aliases: ["terrace grounds", "terrace", "grounds"],
    mapPosition: { x: 10.0, y: 31.5 },
  },

  {
    id: "lower-terrace-patio",
    name: "Terrace Patio",
    level: "Lower Level",
    type: "outdoor-area",
    area: "Garden / Terrace Grounds",
    description: "Outdoor patio area adjacent to the Terrace Grounds.",
    aliases: ["terrace patio", "patio"],
    mapPosition: { x: 18.0, y: 32.8 },
  },

  {
    id: "lower-pdr-1",
    name: "Private Dining Room 1",
    level: "Lower Level",
    type: "meeting-room",
    area: "Private Dining",
    description: "Intimate private dining space for small groups.",
    aliases: ["pdr 1", "pdr-1", "private dining room 1"],
    mapPosition: { x: 14.2, y: 61.7 },
  },

  {
    id: "lower-pdr-2",
    name: "Private Dining Room 2",
    level: "Lower Level",
    type: "meeting-room",
    area: "Private Dining",
    description: "Intimate private dining space for small groups.",
    aliases: ["pdr 2", "pdr-2", "private dining room 2"],
    mapPosition: { x: 18.8, y: 56.2 },
  },

  {
    id: "lower-pdr-3",
    name: "Private Dining Room 3",
    level: "Lower Level",
    type: "meeting-room",
    area: "Private Dining",
    description: "Intimate private dining space for small groups.",
    aliases: ["pdr 3", "pdr-3", "private dining room 3"],
    mapPosition: { x: 24.5, y: 34.2 },
  },

  {
    id: "lower-buffet",
    name: "Buffet Area",
    level: "Lower Level",
    type: "service-area",
    area: "Food Service",
    description: "Buffet service area for catering and food service.",
    aliases: ["buffet", "buffet area"],
    mapPosition: { x: 23.0, y: 48.8 },
  },

  {
    id: "lower-kitchen",
    name: "Kitchen",
    level: "Lower Level",
    type: "service-area",
    area: "Food Service",
    description: "Main kitchen facility for food preparation.",
    aliases: ["kitchen"],
    mapPosition: { x: 28.0, y: 37.2 },
  },

  {
    id: "lower-green-room",
    name: "Green Room",
    level: "Lower Level",
    type: "meeting-room",
    area: "Support Spaces",
    description: "Preparation and waiting area for speakers and performers.",
    aliases: ["green room", "green-room"],
    mapPosition: { x: 25.5, y: 14.4 },
  },

  {
    id: "lower-restrooms-garden-marquee",
    name: "Restrooms - Garden Marquee",
    level: "Lower Level",
    type: "restroom",
    area: "Facilities",
    description: "Restroom facilities near the Garden Marquee.",
    aliases: ["restrooms garden marquee", "wc garden marquee", "toilets garden marquee"],
    mapPosition: { x: 23.2, y: 6.9 },
  },

  {
    id: "lower-terrace-room-restaurant",
    name: "Terrace Room Restaurant",
    level: "Lower Level",
    type: "event-room",
    area: "Dining",
    description: "Restaurant and dining event space on the Lower Level.",
    aliases: ["terrace room restaurant", "terrace restaurant", "restaurant"],
    mapPosition: { x: 12.3, y: 53.6 },
  },

  {
    id: "lower-fitness-center",
    name: "Fitness Center",
    level: "Lower Level",
    type: "service-area",
    area: "Amenities",
    description: "Fitness and wellness facility.",
    aliases: ["fitness center", "fitness", "gym"],
    mapPosition: { x: 16.9, y: 82.5 },
  },

  // =========================
  // MAIN LEVEL
  // =========================

  {
    id: "main-roy-e-wilbanks-ballroom",
    name: "Roy E. Wilbanks Ballroom",
    level: "Main Level",
    type: "ballroom",
    area: "Ballroom",
    description: "Grand ballroom for large conferences and events.",
    aliases: ["roy e wilbanks ballroom", "wilbanks ballroom", "ballroom"],
    mapPosition: { x: 51.5, y: 17.8 },
  },

  {
    id: "main-salon-1",
    name: "Salon 1",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 1", "salon-1"],
    mapPosition: { x: 47.4, y: 36.8 },
  },

  {
    id: "main-salon-2",
    name: "Salon 2",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 2", "salon-2"],
    mapPosition: { x: 47.4, y: 29.3 },
  },

  {
    id: "main-salon-3",
    name: "Salon 3",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 3", "salon-3"],
    mapPosition: { x: 47.4, y: 22.4 },
  },

  {
    id: "main-salon-4",
    name: "Salon 4",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 4", "salon-4"],
    mapPosition: { x: 52.0, y: 26.5 },
  },

  {
    id: "main-salon-5",
    name: "Salon 5",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 5", "salon-5"],
    mapPosition: { x: 56.5, y: 36.7 },
  },

  {
    id: "main-salon-6",
    name: "Salon 6",
    level: "Main Level",
    type: "meeting-room",
    area: "Salon Spaces",
    description: "Breakout meeting room for concurrent sessions.",
    aliases: ["salon 6", "salon-6"],
    mapPosition: { x: 56.4, y: 26.3 },
  },

  {
    id: "main-pre-function-a",
    name: "Pre-Function Area A",
    level: "Main Level",
    type: "event-room",
    area: "Pre-Function Spaces",
    description: "Pre-function space for receptions and gatherings.",
    aliases: ["pre-function a", "pre function a", "pre-function area a"],
    mapPosition: { x: 52.0, y: 39.4 },
  },

  {
    id: "main-meeting-space",
    name: "Meeting Space",
    level: "Main Level",
    type: "meeting-room",
    area: "Meeting Spaces",
    description: "General purpose meeting and breakout space.",
    aliases: ["meeting space", "meeting"],
    mapPosition: { x: 43.2, y: 52.7 },
  },

  {
    id: "main-lobby",
    name: "Main Lobby",
    level: "Main Level",
    type: "entrance",
    area: "Lobby",
    description: "Main lobby and reception area.",
    aliases: ["main lobby", "lobby"],
    mapPosition: { x: 41.8, y: 65.0 },
  },

  {
    id: "main-front-desk",
    name: "Front Desk",
    level: "Main Level",
    type: "service-area",
    area: "Reception",
    description: "Front desk and check-in area.",
    aliases: ["front desk", "front-desk", "desk"],
    mapPosition: { x: 35.7, y: 69.7 },
  },

  {
    id: "main-guest-services",
    name: "Guest Services",
    level: "Main Level",
    type: "service-area",
    area: "Reception",
    description: "Guest services and information desk.",
    aliases: ["guest services", "guest-services", "services"],
    mapPosition: { x: 33.7, y: 76.5 },
  },

  {
    id: "main-entry-exit",
    name: "Main Entry/Exit",
    level: "Main Level",
    type: "entrance",
    area: "Entrance",
    description: "Primary entry and exit point.",
    aliases: ["main entry exit", "entry exit", "entrance"],
    mapPosition: { x: 40.2, y: 88.7 },
  },

  {
    id: "main-conference-center-lobby",
    name: "Conference Center Lobby",
    level: "Main Level",
    type: "entrance",
    area: "Conference Center",
    description: "Lobby area for the Conference Center section.",
    aliases: ["conference center lobby", "cc lobby"],
    mapPosition: { x: 68.0, y: 46.5 },
  },

  {
    id: "main-auditorium-1",
    name: "Auditorium 1",
    level: "Main Level",
    type: "auditorium",
    area: "Auditoriums",
    description: "Large auditorium for keynote presentations.",
    aliases: ["auditorium 1", "auditorium-1", "aud 1"],
    mapPosition: { x: 73.8, y: 72.0 },
  },

  {
    id: "main-auditorium-2",
    name: "Auditorium 2",
    level: "Main Level",
    type: "auditorium",
    area: "Auditoriums",
    description: "Large auditorium for keynote presentations.",
    aliases: ["auditorium 2", "auditorium-2", "aud 2"],
    mapPosition: { x: 74.2, y: 50.2 },
  },

  {
    id: "main-atrium",
    name: "Atrium",
    level: "Main Level",
    type: "outdoor-area",
    area: "Open Spaces",
    description: "Central atrium space for networking and gatherings.",
    aliases: ["atrium"],
    mapPosition: { x: 70.8, y: 57.0 },
  },

  {
    id: "main-conference-center-terrace",
    name: "Conference Center Terrace",
    level: "Main Level",
    type: "outdoor-area",
    area: "Outdoor Spaces",
    description: "Outdoor terrace adjacent to the Conference Center.",
    aliases: ["conference center terrace", "cc terrace", "terrace"],
    mapPosition: { x: 64.5, y: 64.0 },
  },

  {
    id: "main-conference-center-lawn",
    name: "Conference Center Lawn",
    level: "Main Level",
    type: "outdoor-area",
    area: "Outdoor Spaces",
    description: "Outdoor lawn area for events and activities.",
    aliases: ["conference center lawn", "cc lawn", "lawn"],
    mapPosition: { x: 59.0, y: 59.0 },
  },

  {
    id: "main-restrooms-ballroom",
    name: "Restrooms - Ballroom",
    level: "Main Level",
    type: "restroom",
    area: "Facilities",
    description: "Restroom facilities near the Ballroom.",
    aliases: ["restrooms ballroom", "wc ballroom", "toilets ballroom"],
    mapPosition: { x: 49.6, y: 47.7 },
  },

  {
    id: "main-restrooms-conference-center",
    name: "Restrooms - Conference Center",
    level: "Main Level",
    type: "restroom",
    area: "Facilities",
    description: "Restroom facilities in the Conference Center.",
    aliases: ["restrooms conference center", "wc conference center", "toilets cc"],
    mapPosition: { x: 70.6, y: 29.3 },
  },

  {
    id: "main-elevator-fb",
    name: "Elevator - Front Building",
    level: "Main Level",
    type: "elevator",
    area: "Vertical Access",
    description: "Elevator in the front building.",
    aliases: ["elevator fb", "elevator front building"],
    mapPosition: { x: 38.8, y: 43.3 },
  },

  {
    id: "main-elevator-conference-center",
    name: "Elevator - Conference Center",
    level: "Main Level",
    type: "elevator",
    area: "Vertical Access",
    description: "Elevator in the Conference Center.",
    aliases: ["elevator conference center", "elevator cc"],
    mapPosition: { x: 68.2, y: 42.9 },
  },

  // =========================
  // 2ND LEVEL
  // =========================

  {
    id: "second-ballroom-foyer",
    name: "Ballroom Foyer",
    level: "2nd Level",
    type: "event-room",
    area: "Ballroom",
    description: "Foyer and pre-function space for the second level ballroom.",
    aliases: ["ballroom foyer", "foyer"],
    mapPosition: { x: 86.5, y: 34.0 },
  },

  {
    id: "second-meeting-room-a",
    name: "Meeting Room A",
    level: "2nd Level",
    type: "meeting-room",
    area: "Meeting Rooms",
    description: "Breakout meeting room on the second level.",
    aliases: ["meeting room a", "meeting-room-a", "room a"],
    mapPosition: { x: 89.0, y: 49.0 },
  },

  {
    id: "second-meeting-room-b",
    name: "Meeting Room B",
    level: "2nd Level",
    type: "meeting-room",
    area: "Meeting Rooms",
    description: "Breakout meeting room on the second level.",
    aliases: ["meeting room b", "meeting-room-b", "room b"],
    mapPosition: { x: 88.8, y: 65.0 },
  },

  {
    id: "second-meeting-room-c",
    name: "Meeting Room C",
    level: "2nd Level",
    type: "meeting-room",
    area: "Meeting Rooms",
    description: "Breakout meeting room on the second level.",
    aliases: ["meeting room c", "meeting-room-c", "room c"],
    mapPosition: { x: 82.5, y: 85.0 },
  },

  {
    id: "second-executive-boardroom",
    name: "Executive Boardroom",
    level: "2nd Level",
    type: "meeting-room",
    area: "Executive Spaces",
    description: "Premium boardroom for executive meetings.",
    aliases: ["executive boardroom", "boardroom", "executive"],
    mapPosition: { x: 94.4, y: 48.2 },
  },

  {
    id: "second-vip-lounge",
    name: "VIP Lounge",
    level: "2nd Level",
    type: "event-room",
    area: "VIP Spaces",
    description: "Exclusive VIP lounge for premium attendees.",
    aliases: ["vip lounge", "vip-lounge", "lounge"],
    mapPosition: { x: 93.8, y: 56.0 },
  },

  {
    id: "second-business-center",
    name: "Business Center",
    level: "2nd Level",
    type: "service-area",
    area: "Support Spaces",
    description: "Business center with workstations and services.",
    aliases: ["business center", "business-center"],
    mapPosition: { x: 89.2, y: 18.0 },
  },

  {
    id: "second-restrooms",
    name: "Restrooms",
    level: "2nd Level",
    type: "restroom",
    area: "Facilities",
    description: "Restroom facilities on the second level.",
    aliases: ["restrooms", "wc", "toilets"],
    mapPosition: { x: 93.0, y: 29.5 },
  },

  {
    id: "second-elevator",
    name: "Elevator",
    level: "2nd Level",
    type: "elevator",
    area: "Vertical Access",
    description: "Elevator access on the second level.",
    aliases: ["elevator"],
    mapPosition: { x: 86.6, y: 26.7 },
  },

  {
    id: "second-stairs",
    name: "Stairs",
    level: "2nd Level",
    type: "service-area",
    area: "Vertical Access",
    description: "Stairwell access on the second level.",
    aliases: ["stairs", "stairwell"],
    mapPosition: { x: 84.5, y: 28.5 },
  },
];