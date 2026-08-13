import { rooms } from "../data/rooms.js";
import { sessionsService } from "./sessionsService.js";
import { serviceConfig } from "./config.js";
import { apiClient } from "./apiClient.js";

function getDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

export const roomService = {
  async getAll() {
    return serviceConfig.mode === "api"
      ? apiClient.get("/rooms")
      : rooms;
  },

  async getById(roomId) {
    const allRooms = await this.getAll();
    return allRooms.find(room => room.id === roomId);
  },

  async getSessions(roomId) {
    const room = await this.getById(roomId);
    if (!room) return [];

    const sessions = await sessionsService.getAll();

    return sessions.filter(
      session =>
        session.room === room.appRoom ||
        room.aliases?.includes(session.room)
    );
  },

  async getCurrentSession(roomId, now = new Date()) {
    const sessions = await this.getSessions(roomId);

    return sessions.find(session => {
      const start = getDateTime(session.date, session.start);
      const end = getDateTime(session.date, session.end);

      return start <= now && end > now;
    });
  },

  async getNextSession(roomId, now = new Date()) {
    const sessions = await this.getSessions(roomId);

    return sessions
      .filter(session => {
        const start = getDateTime(
          session.date,
          session.start
        );

        return start > now;
      })
      .sort(
        (a, b) =>
          getDateTime(a.date, a.start) -
          getDateTime(b.date, b.start)
      )[0];
  },

  async getStatus(roomId, now = new Date()) {
    const current = await this.getCurrentSession(
      roomId,
      now
    );

    if (current) {
      return "live";
    }

    const next = await this.getNextSession(
      roomId,
      now
    );

    if (!next) {
      return "empty";
    }

    const minutes =
      (getDateTime(next.date, next.start) - now) /
      60000;

    if (minutes <= 15) {
      return "soon";
    }

    return "next";
  }
};