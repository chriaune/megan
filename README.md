# v0.032

Built from the stable v0.031c baseline.

## Header improvements

The event header now displays the current event date and time derived from:

```text
event.current = 2026-11-17T13:45:00
```

Default result:

```text
Event Day 2 · Tue Nov 17 · 13:45
Up Next: MGIT and Vendor Fair (14:00)
```

The next agenda topic is calculated from the loaded session data through the service layer. If there is no later session on the current event day, the header displays:

```text
Up Next: End of Event Day
```

The day selector for Agenda and My Day remains independent. Changing the viewed agenda day does not incorrectly change the current event day shown in the header.

## Existing features retained

- v0.030a-style mobile UI
- corrected connection rendering from v0.031c
- browser persistence in mock mode
- Azure Function-ready service layer

## Run

```bash
npm install
npm run dev
```
