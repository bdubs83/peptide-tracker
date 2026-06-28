import React from "react";
import type { CalendarDay, DayEvent } from "../features/calendar/calendarUtils";
import type { VaultUser } from "../types/vaultUser";
import { DEFAULT_VAULT_USER_ID } from "../types/vaultUser";

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: string;
  onDayClick: (day: CalendarDay) => void;
  getDayEvents: (dateStr: string) => DayEvent[];
  vaultUsers?: VaultUser[];
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  onDayClick,
  getDayEvents,
  vaultUsers = [],
}) => {
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const userById = React.useMemo(
    () => new Map(vaultUsers.map((user) => [user.id, user])),
    [vaultUsers]
  );
  const getUserLabel = (userId?: string) => {
    const user = userById.get(userId || DEFAULT_VAULT_USER_ID);
    return user?.displayName.slice(0, 2).toUpperCase() || "U1";
  };
  const getUserColor = (userId?: string) => userById.get(userId || DEFAULT_VAULT_USER_ID)?.color || "var(--color-primary)";

  const getStatusDotColor = (status: DayEvent["status"]) => {
    switch (status) {
      case "completed":
        return "var(--color-success)"; // green
      case "due":
        return "var(--color-warning)"; // amber
      case "upcoming":
        return "var(--color-primary)"; // indigo
      case "missed":
        return "var(--color-danger)"; // red
      case "skipped":
        return "var(--text-secondary)"; // gray
      default:
        return "transparent";
    }
  };

  return (
    <div className="calendar-grid">
      {/* Weekdays Header */}
      <div className="calendar-weekday-row">
        {weekdays.map((day) => (
          <span
            key={day}
            className="calendar-weekday-label"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="calendar-day-grid">
        {days.map((day) => {
          const events = getDayEvents(day.dateStr);
          const isSelected = selectedDate === day.dateStr;
          const groupedUserEvents = Array.from(
            events.reduce((map, event) => {
              const userId = event.peptide.vaultUserId || DEFAULT_VAULT_USER_ID;
              const group = map.get(userId) || [];
              group.push(event);
              map.set(userId, group);
              return map;
            }, new Map<string, DayEvent[]>())
          ).slice(0, 3);
          const visibleEventCount = groupedUserEvents.reduce((count, [, userEvents]) => count + userEvents.length, 0);

          return (
            <div
              key={day.dateStr}
              className="calendar-day-cell"
              onClick={() => onDayClick(day)}
              style={{
                background: isSelected
                  ? "rgba(99, 102, 241, 0.15)"
                  : day.isCurrentMonth
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(255, 255, 255, 0.005)",
                border: "1px solid",
                borderColor: isSelected
                  ? "var(--color-primary)"
                  : day.isToday
                  ? "rgba(99, 102, 241, 0.4)"
                  : "var(--border-color)",
                opacity: day.isCurrentMonth ? 1 : 0.4,
              }}
            >
              {/* Day Number */}
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: day.isToday || isSelected ? 700 : 400,
                  color: day.isToday
                    ? "var(--color-primary)"
                    : isSelected
                    ? "var(--text-primary)"
                    : "var(--text-primary)",
                }}
              >
                {day.dayNumber}
              </span>

              {/* User indicators */}
              <div
                className="calendar-user-indicators"
              >
                {groupedUserEvents.map(([userId, userEvents]) => (
                  <div key={userId} className="calendar-user-dot-group">
                    <span className="calendar-user-label" style={{ color: getUserColor(userId) }}>
                      {getUserLabel(userId)}
                    </span>
                    <span className="calendar-user-dot-row">
                      {userEvents.slice(0, 5).map((event, index) => (
                        <span
                          key={`${event.peptide.id}-${index}`}
                          className="calendar-user-dot"
                          style={{ backgroundColor: getStatusDotColor(event.status) }}
                          title={event.peptide.name}
                        />
                      ))}
                      {userEvents.length > 5 && <span className="calendar-more-dot">+</span>}
                    </span>
                  </div>
                ))}
                {events.length > visibleEventCount && (
                  <span
                    style={{
                      fontSize: "0.55rem",
                      color: "var(--text-secondary)",
                      lineHeight: "1",
                      marginTop: "-2px",
                    }}
                  >
                    +
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
