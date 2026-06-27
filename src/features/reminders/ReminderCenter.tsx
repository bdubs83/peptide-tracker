import React, { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell, CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import { db } from "../../db/db";
import { ensureDefaultVaultUser } from "../../db/vaultUsers";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { addDays, getLocalDateString } from "../../utils/dateUtils";
import { getEventsForDateRange } from "../calendar/calendarUtils";
import {
  getInAppReminderWindowMinutes,
  getReminderLeadMinutes,
  resolveReminderPreferences,
  type DeviceReminderLead,
  type SecondaryDeviceReminderLead,
} from "./reminderUtils";
import type { DayEvent } from "../calendar/calendarUtils";
import { DEFAULT_VAULT_USER_ID } from "../../types/vaultUser";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";

type ReminderRow = {
  event: DayEvent;
  date: string;
};

const notificationStorageKey = (date: string, lead: string, reminderKey: string) =>
  `inner-circle-device-reminder-${date}-${lead}-${reminderKey}`;

const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const showDeviceNotification = async (title: string, body: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "inner-circle-injection-reminder",
      });
      return;
    } catch {
      // Fall back to the basic Notification API below.
    }
  }

  new Notification(title, {
    body,
    icon: "/icon-192.png",
    tag: "inner-circle-injection-reminder",
  });
};

const buildScheduledDateTime = (date: string, time = "09:00") => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
};

const isWithinInAppWindow = (event: DayEvent, date: string, now: Date, windowMinutes: number) => {
  if (event.status === "missed") return true;

  const scheduledAt = buildScheduledDateTime(date, event.schedule?.injectionTime);
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);
  return scheduledAt >= now && scheduledAt <= windowEnd;
};

const isDeviceReminderDue = (
  event: DayEvent,
  date: string,
  now: Date,
  lead: DeviceReminderLead | Exclude<SecondaryDeviceReminderLead, "none">
) => {
  if (event.status === "missed") return true;

  const scheduledAt = buildScheduledDateTime(date, event.schedule?.injectionTime);
  const reminderAt = new Date(scheduledAt.getTime() - getReminderLeadMinutes(lead) * 60 * 1000);
  return now >= reminderAt;
};

const eventDateLabel = (date: string, today: string, leadDate: string) => {
  if (date === today) return "Today";
  if (date === leadDate) return "Tomorrow";
  return date;
};

const eventTimeLabel = (event: DayEvent) => event.schedule?.injectionTime || "09:00";

const getEventUserId = (event: DayEvent) => event.peptide.vaultUserId || DEFAULT_VAULT_USER_ID;

const compareReminderRows = (a: ReminderRow, b: ReminderRow) => {
  const aTime = buildScheduledDateTime(a.date, a.event.schedule?.injectionTime).getTime();
  const bTime = buildScheduledDateTime(b.date, b.event.schedule?.injectionTime).getTime();
  if (aTime !== bTime) return aTime - bTime;

  const aUser = getEventUserId(a.event);
  const bUser = getEventUserId(b.event);
  if (aUser !== bUser) return aUser.localeCompare(bUser);

  return a.event.peptide.name.localeCompare(b.event.peptide.name);
};

const getReminderRowsForRange = (
  startDate: string,
  endDate: string,
  peptides: Peptide[],
  schedules: PeptideSchedule[],
  logs: InjectionLog[]
) => {
  return Array.from(getEventsForDateRange(startDate, endDate, peptides, schedules, logs).entries())
    .flatMap(([date, events]) =>
      events
        .filter((event) => event.status === "due" || event.status === "missed" || event.status === "upcoming")
        .map((event) => ({ event, date }))
    )
    .sort(compareReminderRows);
};

const eventStatusLabel = (event: DayEvent, date: string, today: string, leadDate: string) => {
  if (event.status === "missed") return "Missed";
  if (event.status === "due") return "Due";
  return eventDateLabel(date, today, leadDate);
};

export const ReminderCenter: React.FC = () => {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.appSettings.toArray());
  const peptides = useLiveQuery(() => db.peptides.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());
  const logs = useLiveQuery(() => db.injectionLogs.toArray());
  const vaultUsers = useLiveQuery(async () => {
    await ensureDefaultVaultUser();
    return db.vaultUsers.orderBy("sortOrder").toArray();
  });
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [now, setNow] = React.useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const preferences = resolveReminderPreferences(settings);
  const today = getLocalDateString();
  const inAppWindowMinutes = getInAppReminderWindowMinutes(preferences.inAppWindow);
  const inAppEndDate = addDays(today, preferences.inAppWindow === "3day" ? 3 : 1);
  const reminderRows = useMemo(() => {
    if (!peptides || !schedules || !logs) return [];
    return getReminderRowsForRange(today, inAppEndDate, peptides, schedules, logs).filter(({ event, date }) =>
      isWithinInAppWindow(event, date, now, inAppWindowMinutes)
    );
  }, [inAppEndDate, inAppWindowMinutes, logs, now, peptides, schedules, today]);
  const reminderEvents = useMemo(() => reminderRows.map((row) => row.event), [reminderRows]);
  const reminderPreviewRows = reminderRows.slice(0, 3);
  const dueCount = reminderRows.filter(({ event }) => event.status === "due").length;
  const missedCount = reminderRows.filter(({ event }) => event.status === "missed").length;
  const upcomingCount = reminderRows.filter(({ event }) => event.status === "upcoming").length;
  const notificationPermission = getNotificationPermission();
  const userById = useMemo(() => new Map((vaultUsers || []).map((user) => [user.id, user])), [vaultUsers]);
  const getUserName = useCallback(
    (event: DayEvent) => userById.get(getEventUserId(event))?.displayName || "User 1",
    [userById]
  );
  const deviceRows = useMemo(() => {
    if (!peptides || !schedules || !logs) return [];
    return getReminderRowsForRange(today, addDays(today, 1), peptides, schedules, logs);
  }, [logs, peptides, schedules, today]);

  useEffect(() => {
    if (
      !preferences.deviceEnabled ||
      notificationPermission !== "granted" ||
      deviceRows.length === 0
    ) {
      return;
    }

    const deviceLeads = [preferences.devicePrimaryLead, preferences.deviceSecondaryLead].filter(
      (lead, index, list): lead is DeviceReminderLead | Exclude<SecondaryDeviceReminderLead, "none"> =>
        lead !== "none" && list.indexOf(lead) === index
    );

    deviceLeads.forEach((lead) => {
      const dueRows = deviceRows.filter(({ event, date }) => isDeviceReminderDue(event, date, now, lead));
      if (dueRows.length === 0) return;

      const deviceReminderKey = dueRows.map(({ event, date }) => `${event.peptide.id}-${date}-${event.status}`).join("|");
      const storageKey = notificationStorageKey(today, lead, deviceReminderKey);
      if (localStorage.getItem(storageKey) === deviceReminderKey) return;

      const firstEvent = dueRows[0];
      const leadLabel = lead === "atTime" ? "at injection time" : `${getReminderLeadMinutes(lead)} minutes before`;
      const firstEventText = `${getUserName(firstEvent.event)}: ${firstEvent.event.peptide.name} at ${eventTimeLabel(firstEvent.event)}.`;
      const countText = dueRows.length === 1 ? "1 injection reminder" : `${dueRows.length} injection reminders`;

      showDeviceNotification("Injection reminder", `${countText} ${leadLabel}. ${firstEventText}`).then(() => {
        localStorage.setItem(storageKey, deviceReminderKey);
      });
    });
  }, [
    deviceRows,
    getUserName,
    notificationPermission,
    now,
    preferences.deviceEnabled,
    preferences.devicePrimaryLead,
    preferences.deviceSecondaryLead,
    today,
  ]);

  if (!preferences.inAppEnabled || reminderEvents.length === 0) return null;

  return (
    <Card
      style={{
        marginBottom: "14px",
        border: missedCount > 0 ? "1px solid rgba(244, 63, 94, 0.35)" : "1px solid rgba(99, 102, 241, 0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            background: missedCount > 0 ? "rgba(244, 63, 94, 0.12)" : "rgba(99, 102, 241, 0.12)",
            color: missedCount > 0 ? "var(--color-danger)" : "var(--color-primary)",
            flexShrink: 0,
          }}
        >
          <Bell size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: "0.98rem", marginBottom: "3px" }}>Injection Reminders</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.45 }}>
                {dueCount > 0 && `${dueCount} due now. `}
                {missedCount > 0 && `${missedCount} missed. `}
                {upcomingCount > 0 && `${upcomingCount} upcoming. `}
              </p>
            </div>
            <button
              type="button"
              title={isCollapsed ? "Expand reminders" : "Collapse reminders"}
              aria-label={isCollapsed ? "Expand reminders" : "Collapse reminders"}
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((collapsed) => !collapsed)}
              style={{
                width: "32px",
                height: "32px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                background: "var(--bg-button-secondary)",
                color: "var(--text-secondary)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {isCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            </button>
          </div>
          {!isCollapsed && (
            <>
              <div style={{ display: "grid", gap: "6px", marginTop: "9px" }}>
                {reminderPreviewRows.map(({ event, date }) => (
                  <div
                    key={`${event.peptide.id}-${date}-${event.status}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "7px 8px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800 }}>
                      {getUserName(event)}: {event.peptide.name}
                    </span>
                    <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
                      {eventStatusLabel(event, date, today, inAppEndDate)} {eventTimeLabel(event)}
                    </span>
                  </div>
                ))}
                {reminderRows.length > reminderPreviewRows.length && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", textAlign: "center" }}>
                    Plus {reminderRows.length - reminderPreviewRows.length} more.
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <Button variant="secondary" onClick={() => navigate("/calendar")} style={{ padding: "7px 10px" }}>
                  <CalendarClock size={15} />
                  View
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
