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
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Weekdays Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          marginBottom: "8px",
        }}
      >
        {weekdays.map((day) => (
          <span
            key={day}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              padding: "4px 0",
            }}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Grid Cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px",
        }}
      >
        {days.map((day) => {
          const events = getDayEvents(day.dateStr);
          const isSelected = selectedDate === day.dateStr;
          const userEvents = Array.from(
            new Map(events.map((event) => [event.peptide.vaultUserId || DEFAULT_VAULT_USER_ID, event])).values()
          ).slice(0, 3);

          return (
            <div
              key={day.dateStr}
              onClick={() => onDayClick(day)}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 2px",
                borderRadius: "var(--border-radius-sm)",
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
                cursor: "pointer",
                position: "relative",
                transition: "all var(--transition-fast)",
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
                style={{
                  display: "grid",
                  gap: "2px",
                  width: "100%",
                  minHeight: "24px",
                }}
              >
                {userEvents.map((event) => (
                  <span
                    key={event.peptide.vaultUserId || DEFAULT_VAULT_USER_ID}
                    style={{
                      minHeight: "10px",
                      borderRadius: "4px",
                      borderLeft: `3px solid ${getUserColor(event.peptide.vaultUserId)}`,
                      backgroundColor: getStatusDotColor(event.status),
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.48rem",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {getUserLabel(event.peptide.vaultUserId)}
                  </span>
                ))}
                {events.length > userEvents.length && (
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
