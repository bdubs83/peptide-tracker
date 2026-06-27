import React, { useCallback, useEffect, useId, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Button } from "../../components/Button";
import { firebaseAuth, googleAuthProvider } from "../../firebase/firebase";
import {
  getCloudDataCounts,
  compareLocalAndCloudData,
  getLocalDataCounts,
  hasCloudProfile,
  mergeCloudDataIntoLocal,
  restoreCloudDataToLocal,
  uploadLocalDataToCloud,
  type CloudDataCounts,
  type CloudCollectionComparison,
} from "../../firebase/cloudSync";
import type { WeightLog } from "../../types/weightLog";
import type { AppSettingValue } from "../../db/schema";
import { isAppTheme, resolveAppSettings, updateAppSettings } from "../../db/appSettings";
import {
  Database,
  Bell,
  Download,
  FileDown,
  Save,
  Plus,
  Trash2,
  X,
  Edit2,
  Settings,
  Scale,
  AlertTriangle,
  Upload,
  Cloud,
  LogIn,
  LogOut,
  Smartphone,
  HelpCircle,
} from "lucide-react";
import type { Peptide } from "../../types/peptide";
import type { PeptideSchedule } from "../../types/schedule";
import type { InjectionLog } from "../../types/injectionLog";
import type { StockItem } from "../../types/stock";
import type { VaultUser } from "../../types/vaultUser";
import type { AppSetting } from "../../db/schema";
import type { AppTheme, LayoutMode } from "../../db/schema";
import {
  isDeviceReminderLead,
  isInAppReminderWindow,
  isSecondaryDeviceReminderLead,
  resolveReminderPreferences,
  type DeviceReminderLead,
  type InAppReminderWindow,
  type SecondaryDeviceReminderLead,
} from "../reminders/reminderUtils";

type DisplayMode = "units" | "mL";
type DosingUnit = "mcg" | "mg";
type MeasurementSystem = "imperial" | "metric";
type TrackingMode = "weight" | "measurements";
type EditableWeightLogField = Exclude<
  keyof WeightLog,
  "id" | "customMeasurements" | "createdAt" | "updatedAt"
>;
type BackupData = {
  version: 1;
  exportedAt: string;
  peptides: Peptide[];
  schedules: PeptideSchedule[];
  injectionLogs: InjectionLog[];
  weightLogs: WeightLog[];
  stockItems?: StockItem[];
  vaultUsers?: VaultUser[];
  appSettings: AppSetting[];
};

const isDisplayMode = (value: unknown): value is DisplayMode => value === "units" || value === "mL";
const isDosingUnit = (value: unknown): value is DosingUnit => value === "mcg" || value === "mg";
const isMeasurementSystem = (value: unknown): value is MeasurementSystem =>
  value === "imperial" || value === "metric";
const isTrackingMode = (value: unknown): value is TrackingMode =>
  value === "weight" || value === "measurements";

const themeOptions: { value: AppTheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "professional", label: "Professional" },
  { value: "fun", label: "Fun" },
  { value: "cottonCandySkies", label: "#38 Cotton Candy Skies" },
  { value: "electropop", label: "#42 Electropop" },
  { value: "urbanGraffiti", label: "#50 Urban Graffiti" },
];

const cloudCollectionLabels: Record<string, string> = {
  peptides: "Vials",
  schedules: "Schedules",
  injectionLogs: "Injection Logs",
  weightLogs: "Body Logs",
  stockItems: "Stock",
  vaultUsers: "Users",
  appSettings: "Settings",
};

// Local date/time input helper functions
const getTodayInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const getCurrentTimeInputValue = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const downloadTextFile = (filename: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const csvEscape = (value: unknown) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (headers: string[], rows: unknown[][]) => {
  return [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
};

const isBackupData = (value: unknown): value is BackupData => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BackupData>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.peptides) &&
    Array.isArray(candidate.schedules) &&
    Array.isArray(candidate.injectionLogs) &&
    Array.isArray(candidate.weightLogs) &&
    (candidate.stockItems === undefined || Array.isArray(candidate.stockItems)) &&
    (candidate.vaultUsers === undefined || Array.isArray(candidate.vaultUsers)) &&
    Array.isArray(candidate.appSettings)
  );
};

interface WeightChartProps {
  entries: WeightLog[];
  goalWeight: number | null;
  weightUnit: string;
}

const WeightChart: React.FC<WeightChartProps> = ({ entries, goalWeight, weightUnit }) => {
  const generatedGradientId = useId();
  const gradientId = `weight-area-grad-${generatedGradientId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [chartSize, setChartSize] = useState({ width: 500, height: 220 });

  const parsedEntries = useMemo(() => {
    return entries
      .map((e) => ({
        ...e,
        parsedWeight: parseFloat(e.weight),
        timestamp: new Date(`${e.date}T${e.time || "12:00"}`).getTime(),
      }))
      .filter((e) => !isNaN(e.parsedWeight))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [entries]);

  // Chart dimensions
  const width = 500;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 35, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // X Scaling
  const minTime = parsedEntries[0]?.timestamp || 0;
  const maxTime = parsedEntries[parsedEntries.length - 1]?.timestamp || minTime;
  const xScale = useCallback((timestamp: number) => {
    if (minTime === maxTime) return padding.left + plotWidth / 2;
    return padding.left + ((timestamp - minTime) / (maxTime - minTime)) * plotWidth;
  }, [maxTime, minTime, padding.left, plotWidth]);

  // Y Scaling
  const weights = parsedEntries.map((e) => e.parsedWeight);
  if (goalWeight !== null) {
    weights.push(goalWeight);
  }
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
  const weightSpan = maxWeight - minWeight;
  const yPadding = weightSpan * 0.15 || 5;
  const yMin = minWeight - yPadding;
  const yMax = maxWeight + yPadding;

  const yScale = useCallback((weight: number) => {
    if (yMax === yMin) return padding.top + plotHeight / 2;
    return padding.top + plotHeight - ((weight - yMin) / (yMax - yMin)) * plotHeight;
  }, [padding.top, plotHeight, yMax, yMin]);

  // Generate Line Path
  const linePath = useMemo(() => {
    if (parsedEntries.length < 2) return "";
    return parsedEntries
      .map((e, index) => {
        const x = xScale(e.timestamp);
        const y = yScale(e.parsedWeight);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [parsedEntries, xScale, yScale]);

  // Generate Area Path (gradient fill under line)
  const areaPath = useMemo(() => {
    if (parsedEntries.length < 2) return "";
    const startX = xScale(parsedEntries[0].timestamp);
    const endX = xScale(parsedEntries[parsedEntries.length - 1].timestamp);
    const bottomY = padding.top + plotHeight;
    return `${linePath} L ${endX.toFixed(1)} ${bottomY.toFixed(1)} L ${startX.toFixed(1)} ${bottomY.toFixed(1)} Z`;
  }, [parsedEntries, linePath, xScale, plotHeight, padding.top]);

  // Y axis ticks
  const yTicks = useMemo(() => {
    const list: number[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      list.push(yMin + (i / steps) * (yMax - yMin));
    }
    return list;
  }, [yMin, yMax]);

  // X axis ticks (dates)
  const xTicks = useMemo(() => {
    if (parsedEntries.length <= 1) return [];
    if (parsedEntries.length <= 3) return parsedEntries;
    const midIndex = Math.floor(parsedEntries.length / 2);
    return [parsedEntries[0], parsedEntries[midIndex], parsedEntries[parsedEntries.length - 1]];
  }, [parsedEntries]);

  const hoveredEntry = hoveredIndex !== null ? parsedEntries[hoveredIndex] : null;

  if (parsedEntries.length === 0) return null;

  return (
    <div style={{ width: "100%", position: "relative", marginBottom: "16px" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setChartSize({ width: bounds.width, height: bounds.height });
          const svgX = ((event.clientX - bounds.left) / bounds.width) * width;

          let bestIndex = 0;
          let bestDist = Infinity;
          parsedEntries.forEach((e, idx) => {
            const px = xScale(e.timestamp);
            const dist = Math.abs(px - svgX);
            if (dist < bestDist) {
              bestDist = dist;
              bestIndex = idx;
            }
          });

          setHoveredIndex(bestIndex);
          setHoverPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        }}
        onMouseLeave={() => {
          setHoveredIndex(null);
          setHoverPoint(null);
        }}
        style={{
          width: "100%",
          height: "220px",
          display: "block",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
          background: "rgba(9, 10, 15, 0.45)",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y Grid Lines & Labels */}
        {yTicks.map((tick, i) => {
          const y = yScale(tick);
          return (
            <g key={`y-grid-${i}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="9"
                textAnchor="end"
                fontWeight="700"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X axis tick labels */}
        {xTicks.map((tick, i) => {
          const x = xScale(tick.timestamp);
          return (
            <g key={`x-grid-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 10}
                fill="var(--text-muted)"
                fontSize="9"
                textAnchor="middle"
                fontWeight="700"
              >
                {tick.date.slice(5)}
              </text>
            </g>
          );
        })}

        {/* Goal Weight Line */}
        {goalWeight !== null && (
          <g>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yScale(goalWeight)}
              y2={yScale(goalWeight)}
              stroke="var(--color-success)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={width - padding.right - 4}
              y={yScale(goalWeight) - 6}
              fill="var(--color-success)"
              fontSize="8"
              fontWeight="900"
              textAnchor="end"
              style={{ textTransform: "uppercase" }}
            >
              Goal: {goalWeight} {weightUnit}
            </text>
          </g>
        )}

        {/* Area Gradient Fill */}
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradientId})`} style={{ transition: "d 0.3s ease-out" }} />
        )}

        {/* Line Path */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "d 0.3s ease-out" }}
          />
        )}

        {/* Points */}
        {parsedEntries.map((e, idx) => {
          const x = xScale(e.timestamp);
          const y = yScale(e.parsedWeight);
          const isHovered = idx === hoveredIndex;
          return (
            <circle
              key={e.id}
              cx={x}
              cy={y}
              r={isHovered ? 5.5 : 3.5}
              fill="var(--color-primary)"
              stroke="var(--bg-base)"
              strokeWidth={isHovered ? 2 : 1.5}
              style={{ transition: "cx 0.3s, cy 0.3s, r 0.15s" }}
            />
          );
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredEntry && hoverPoint && (
        <div
          style={{
            position: "absolute",
            top: `${Math.max(8, Math.min(hoverPoint.y + 14, chartSize.height - 80))}px`,
            left: `${Math.max(8, Math.min(hoverPoint.x + 14, chartSize.width - 150))}px`,
            zIndex: 10,
            width: "140px",
            padding: "8px 10px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            background: "rgba(13, 14, 21, 0.96)",
            boxShadow: "var(--shadow-md)",
            pointerEvents: "none",
            fontSize: "0.76rem",
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{hoveredEntry.date}</div>
          <div style={{ color: "var(--color-primary)", fontWeight: 900 }}>
            {hoveredEntry.parsedWeight.toFixed(1)} {weightUnit}
          </div>
          {hoveredEntry.bodyFat && (
            <div style={{ color: "var(--text-secondary)" }}>Body Fat: {hoveredEntry.bodyFat}%</div>
          )}
          {hoveredEntry.notes && (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {hoveredEntry.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ProfilePageProps = {
  mode?: "full" | "bodyTracker";
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ mode = "full" }) => {
  const location = useLocation();
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [localCounts, setLocalCounts] = useState<CloudDataCounts | null>(null);
  const [cloudCounts, setCloudCounts] = useState<CloudDataCounts | null>(null);
  const [cloudComparison, setCloudComparison] = useState<CloudCollectionComparison[] | null>(null);
  const [cloudProfileExists, setCloudProfileExists] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);
  const [isSyncHelpOpen, setIsSyncHelpOpen] = useState(false);

  // --- Preference settings states ---
  const [standardSyringeSize, setStandardSyringeSize] = useState("1.0");
  const [syringeDisplayMode, setSyringeDisplayMode] = useState<DisplayMode>("units");
  const [standardDosingUnit, setStandardDosingUnit] = useState<DosingUnit>("mg");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>("imperial");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("auto");
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [inAppRemindersEnabled, setInAppRemindersEnabled] = useState(true);
  const [deviceNotificationsEnabled, setDeviceNotificationsEnabled] = useState(false);
  const [inAppReminderWindow, setInAppReminderWindow] = useState<InAppReminderWindow>("24hour");
  const [devicePrimaryLead, setDevicePrimaryLead] = useState<DeviceReminderLead>("30min");
  const [deviceSecondaryLead, setDeviceSecondaryLead] = useState<SecondaryDeviceReminderLead>("none");
  const [notificationPermission, setNotificationPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  // --- Body tracker states ---
  const [goalWeight, setGoalWeight] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("weight");
  const [customMeasurementInput, setCustomMeasurementInput] = useState("");

  // --- Weigh-in log form states ---
  const [newDate, setNewDate] = useState(getTodayInputValue());
  const [newWeighTime, setNewWeighTime] = useState(getCurrentTimeInputValue());
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [newWaist, setNewWaist] = useState("");
  const [newChest, setNewChest] = useState("");
  const [newNeck, setNewNeck] = useState("");
  const [newArm, setNewArm] = useState("");
  const [newThigh, setNewThigh] = useState("");
  const [newEntryNotes, setNewEntryNotes] = useState("");
  const [newCustomMeasurements, setNewCustomMeasurements] = useState<Record<string, string>>({});
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<WeightLog | null>(null);

  const defaultTimezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern (EST/EDT)" },
    { value: "America/Chicago", label: "Central (CST/CDT)" },
    { value: "America/Denver", label: "Mountain (MST/MDT)" },
    { value: "America/Phoenix", label: "Arizona (MST)" },
    { value: "America/Los_Angeles", label: "Pacific (PST/PDT)" },
    { value: "America/Anchorage", label: "Alaska (AKST/AKDT)" },
    { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  ];

  const timezoneOptions = [...defaultTimezones];
  if (timezone && !timezoneOptions.some((opt) => opt.value === timezone)) {
    timezoneOptions.push({ value: timezone, label: timezone });
  }

  // Load appSettings and weightLogs
  const settingsList = useLiveQuery(() => db.appSettings.toArray());
  const weightLogs = useLiveQuery(() => db.weightLogs.reverse().sortBy("date"));
  const lastBackupSetting = settingsList?.find((item) => item.key === "lastBackupAt");
  const lastBackupLabel =
    typeof lastBackupSetting?.value === "string"
      ? new Date(lastBackupSetting.value).toLocaleString()
      : "No backup created yet";

  const totalLocalRecords = localCounts
    ? Object.values(localCounts).reduce((sum, count) => sum + count, 0)
    : 0;
  const totalCloudRecords = cloudCounts
    ? Object.values(cloudCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const showMeasurements = trackingMode === "measurements";

  const customMeasurementLabels = customMeasurementInput
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  // Initialize preference settings and tracker configs from IndexedDB settingsList
  useEffect(() => {
    if (settingsList) {
      queueMicrotask(() => {
        const appSettings = resolveAppSettings(settingsList);
        setLayoutMode(appSettings.layoutMode);
        setTheme(appSettings.theme);
        const reminderPreferences = resolveReminderPreferences(settingsList);
        setInAppRemindersEnabled(reminderPreferences.inAppEnabled);
        setDeviceNotificationsEnabled(reminderPreferences.deviceEnabled);
        setInAppReminderWindow(reminderPreferences.inAppWindow);
        setDevicePrimaryLead(reminderPreferences.devicePrimaryLead);
        setDeviceSecondaryLead(reminderPreferences.deviceSecondaryLead);

        settingsList.forEach((item) => {
          if (item.key === "pref_syringeSize" && typeof item.value === "string") setStandardSyringeSize(item.value);
          if (item.key === "pref_displayMode" && isDisplayMode(item.value)) setSyringeDisplayMode(item.value);
          if (item.key === "pref_dosingUnit" && isDosingUnit(item.value)) setStandardDosingUnit(item.value);
          if (item.key === "pref_timezone" && typeof item.value === "string") setTimezone(item.value);
          if (item.key === "pref_measurementSystem" && isMeasurementSystem(item.value)) {
            setMeasurementSystem(item.value);
          }

          if (item.key === "tracker_goalWeight") setGoalWeight(String(item.value));
          if (item.key === "tracker_startWeight") setStartWeight(String(item.value));
          if (item.key === "tracker_mode" && isTrackingMode(item.value)) setTrackingMode(item.value);
          if (item.key === "tracker_customMeasurements") {
            setCustomMeasurementInput(Array.isArray(item.value) ? item.value.join(", ") : "");
          }
        });
      });
    }
  }, [settingsList]);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setCloudUser(user);
      setAuthMessage("");
      setLocalCounts(await getLocalDataCounts());

      if (user) {
        setCloudProfileExists(await hasCloudProfile(user));
        setCloudCounts(await getCloudDataCounts(user));
      } else {
      setCloudProfileExists(false);
      setCloudCounts(null);
      setCloudComparison(null);
      }
    });
  }, []);

  // Handle setting updates
  const updateSetting = async (key: string, value: AppSettingValue) => {
    await db.appSettings.put({ key, value });
  };

  const handleLayoutModeChange = async (value: LayoutMode) => {
    setLayoutMode(value);
    await updateAppSettings({ layoutMode: value });
  };

  const handleThemeChange = async (value: AppTheme) => {
    setTheme(value);
    await updateAppSettings({ theme: value });
  };

  const handleInAppReminderChange = async (enabled: boolean) => {
    setInAppRemindersEnabled(enabled);
    await updateSetting("reminders_inAppEnabled", enabled);
  };

  const handleDeviceNotificationChange = async (enabled: boolean) => {
    if (enabled && !("Notification" in window)) {
      setReminderMessage("This browser does not support device notifications.");
      return;
    }

    if (enabled && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setReminderMessage("Device notifications were not enabled because permission was not granted.");
        setDeviceNotificationsEnabled(false);
        await updateSetting("reminders_deviceEnabled", false);
        return;
      }
    } else if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    if (enabled && "Notification" in window && Notification.permission !== "granted") {
      setReminderMessage("Device notifications are blocked in this browser. You can change that in browser settings.");
      setDeviceNotificationsEnabled(false);
      await updateSetting("reminders_deviceEnabled", false);
      return;
    }

    setReminderMessage(enabled ? "Device notifications are enabled for this browser." : "");
    setDeviceNotificationsEnabled(enabled);
    await updateSetting("reminders_deviceEnabled", enabled);
  };

  const handleInAppReminderWindowChange = async (value: InAppReminderWindow) => {
    setInAppReminderWindow(value);
    await updateSetting("reminders_inAppWindow", value);
  };

  const handleDevicePrimaryLeadChange = async (value: DeviceReminderLead) => {
    setDevicePrimaryLead(value);
    await updateSetting("reminders_devicePrimaryLead", value);
  };

  const handleDeviceSecondaryLeadChange = async (value: SecondaryDeviceReminderLead) => {
    setDeviceSecondaryLead(value);
    await updateSetting("reminders_deviceSecondaryLead", value);
  };

  const refreshCloudStatus = async (user = cloudUser) => {
    setLocalCounts(await getLocalDataCounts());
    if (!user) {
      setCloudCounts(null);
      setCloudProfileExists(false);
      return;
    }
    setCloudProfileExists(await hasCloudProfile(user));
    setCloudCounts(await getCloudDataCounts(user));
  };

  const runAccountAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsAuthBusy(true);
    setAuthMessage("");
    try {
      await action();
      await refreshCloudStatus();
      setAuthMessage(successMessage);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmailSignIn = () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage("Enter an email and password.");
      return;
    }
    runAccountAction(
      () => signInWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword).then(() => undefined),
      "Signed in."
    );
  };

  const handleEmailCreateAccount = () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage("Enter an email and password.");
      return;
    }
    runAccountAction(
      () => createUserWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword).then(() => undefined),
      "Account created. Your local data has not been uploaded yet."
    );
  };

  const handleGoogleSignIn = () => {
    runAccountAction(
      () => signInWithPopup(firebaseAuth, googleAuthProvider).then(() => undefined),
      "Signed in with Google."
    );
  };

  const handleSignOut = () => {
    if (!confirm("Sign out of cloud sync on this device? Your local data will stay on this device, but new changes will not sync until you sign in again.")) return;

    runAccountAction(() => signOut(firebaseAuth), "Signed out. This device is back to local-only mode.");
  };

  const handleUploadLocalToCloud = () => {
    if (!cloudUser) return;
    const message = cloudProfileExists
      ? [
          "Upload this device to your account?",
          "",
          "This will replace the cloud/account copy with exactly what is currently on this device.",
          "Anything that exists only in the cloud will be deleted from the account copy.",
          "",
          "Use this when this device is the clean version you want to keep.",
        ].join("\n")
      : [
          "Upload this device to your account?",
          "",
          "This will create an account backup from the current data on this device.",
        ].join("\n");
    if (!confirm(message)) return;

    runAccountAction(
      () => uploadLocalDataToCloud(cloudUser),
      "This device's data was uploaded to your account."
    );
  };

  const handleCompareLocalAndCloud = () => {
    if (!cloudUser) return;
    if (!confirm("Compare this device with the account copy? This only reads data and will not change anything.")) return;

    runAccountAction(async () => {
      setCloudComparison(await compareLocalAndCloudData(cloudUser));
    }, "Device and account data were compared.");
  };

  const handleRestoreCloudToLocal = () => {
    if (!cloudUser) return;
    if (
      !confirm(
        [
          "Restore account data to this device?",
          "",
          "This will replace the current local data on this device with the cloud/account copy.",
          "Local records that are not in the account copy will be removed from this device.",
          "",
          "Use this only when the cloud/account copy is the version you want on this device.",
        ].join("\n")
      )
    ) return;

    runAccountAction(
      () => restoreCloudDataToLocal(cloudUser),
      "Account data was restored to this device."
    );
  };

  const handleMergeCloudIntoLocal = () => {
    if (!cloudUser) return;
    if (
      !confirm(
        [
          "Merge account data into this device?",
          "",
          "This will bring cloud/account records onto this device.",
          "Matching records will use the account copy, and account-only records may reappear locally.",
          "",
          "Use this when you want to combine account data with this device.",
        ].join("\n")
      )
    ) return;

    runAccountAction(
      () => mergeCloudDataIntoLocal(cloudUser),
      "Account data was merged into this device."
    );
  };

  const handleCustomMeasurementsChange = async (val: string) => {
    setCustomMeasurementInput(val);
    const parsedArray = val
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    await updateSetting("tracker_customMeasurements", parsedArray);
  };

  // Add a weigh-in
  const handleAddWeighIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newWeight.trim()) {
      alert("Weight is required.");
      return;
    }

    const customValues = Object.fromEntries(
      showMeasurements ? customMeasurementLabels.map((label) => [label, newCustomMeasurements[label] || ""]) : []
    );

    const time = newWeighTime || getCurrentTimeInputValue();
    const newLog: WeightLog = {
      id: crypto.randomUUID(),
      date: newDate,
      time,
      weight: newWeight.trim(),
      bodyFat: showMeasurements && newBodyFat ? newBodyFat.trim() : undefined,
      waist: showMeasurements && newWaist ? newWaist.trim() : undefined,
      chest: showMeasurements && newChest ? newChest.trim() : undefined,
      neck: showMeasurements && newNeck ? newNeck.trim() : undefined,
      arm: showMeasurements && newArm ? newArm.trim() : undefined,
      thigh: showMeasurements && newThigh ? newThigh.trim() : undefined,
      notes: newEntryNotes.trim() || undefined,
      customMeasurements: showMeasurements ? customValues : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.weightLogs.put(newLog);

    setNewDate(getTodayInputValue());
    setNewWeighTime(getCurrentTimeInputValue());
    setNewWeight("");
    setNewBodyFat("");
    setNewWaist("");
    setNewChest("");
    setNewNeck("");
    setNewArm("");
    setNewThigh("");
    setNewEntryNotes("");
    setNewCustomMeasurements({});
  };

  // Update a weigh-in
  const handleUpdateEntryField = async (
    id: string,
    field: EditableWeightLogField,
    val: string
  ) => {
    await db.weightLogs.update(id, {
      [field]: val,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateCustomEntryField = async (id: string, label: string, val: string) => {
    const log = await db.weightLogs.get(id);
    if (!log) return;
    const custom = log.customMeasurements ? { ...log.customMeasurements } : {};
    custom[label] = val;
    await db.weightLogs.update(id, {
      customMeasurements: custom,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    await db.weightLogs.delete(entryToDelete.id);
    if (editingEntryId === entryToDelete.id) setEditingEntryId(null);
    setEntryToDelete(null);
  };

  const handleExportBackup = async () => {
    const exportedAt = new Date().toISOString();
    const backup: BackupData = {
      version: 1,
      exportedAt,
      peptides: await db.peptides.toArray(),
      schedules: await db.schedules.toArray(),
      injectionLogs: await db.injectionLogs.toArray(),
      weightLogs: await db.weightLogs.toArray(),
      stockItems: await db.stockItems.toArray(),
      vaultUsers: await db.vaultUsers.toArray(),
      appSettings: await db.appSettings.toArray(),
    };

    downloadTextFile(
      `inner-circle-backup-${exportedAt.slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
    await updateSetting("lastBackupAt", exportedAt);
  };

  const handleImportBackupFile = async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      alert("That file could not be read as JSON.");
      return;
    }
    if (!isBackupData(parsed)) {
      alert("That file does not look like an Inner Circle backup.");
      return;
    }

    if (!confirm("Import this backup? It will replace the current local app data on this device.")) return;

    await db.transaction(
      "rw",
      [db.peptides, db.schedules, db.injectionLogs, db.weightLogs, db.stockItems, db.vaultUsers, db.appSettings],
      async () => {
        await db.peptides.clear();
        await db.schedules.clear();
        await db.injectionLogs.clear();
        await db.weightLogs.clear();
        await db.stockItems.clear();
        await db.vaultUsers.clear();
        await db.appSettings.clear();
        await db.peptides.bulkPut(parsed.peptides);
        await db.schedules.bulkPut(parsed.schedules);
        await db.injectionLogs.bulkPut(parsed.injectionLogs);
        await db.weightLogs.bulkPut(parsed.weightLogs);
        await db.stockItems.bulkPut(parsed.stockItems || []);
        await db.vaultUsers.bulkPut(parsed.vaultUsers || []);
        await db.appSettings.bulkPut(parsed.appSettings);
      }
    );
    await updateSetting("lastBackupAt", new Date().toISOString());
    alert("Backup imported.");
  };

  const handleExportInjectionCsv = async () => {
    const injectionLogs = await db.injectionLogs.toArray();
    const csv = toCsv(
      [
        "Peptide",
        "Scheduled Date",
        "Actual Date Time",
        "Dose",
        "Dose Unit",
        "Draw mL",
        "Draw Units",
        "Status",
        "Injection Site",
        "Notes",
      ],
      injectionLogs.map((log) => [
        log.peptideNameSnapshot,
        log.scheduledDate,
        log.actualDateTime || "",
        log.doseValue,
        log.doseUnit,
        log.drawMl,
        log.drawUnits,
        log.status,
        log.injectionSiteLabel || "",
        log.notes || "",
      ])
    );
    downloadTextFile(`injection-logs-${getTodayInputValue()}.csv`, csv, "text/csv");
  };

  const handleExportWeightCsv = async () => {
    const rows = await db.weightLogs.toArray();
    const csv = toCsv(
      ["Date", "Time", "Weight", "Body Fat", "Waist", "Chest", "Neck", "Arm", "Thigh", "Custom", "Notes"],
      rows.map((log) => [
        log.date,
        log.time,
        log.weight,
        log.bodyFat || "",
        log.waist || "",
        log.chest || "",
        log.neck || "",
        log.arm || "",
        log.thigh || "",
        log.customMeasurements ? JSON.stringify(log.customMeasurements) : "",
        log.notes || "",
      ])
    );
    downloadTextFile(`body-progress-${getTodayInputValue()}.csv`, csv, "text/csv");
  };

  // --- Statistics calculations ---
  const logs = weightLogs || [];
  const sortedLogsAsc = [...logs].reverse(); // oldest first

  const weightEntries = sortedLogsAsc.filter((e) => e.weight !== "" && !isNaN(parseFloat(e.weight)));
  const latestEntry = weightEntries[weightEntries.length - 1];

  const currentWeightNum = latestEntry ? parseFloat(latestEntry.weight) : null;
  const startWeightNum = parseFloat(startWeight) || (weightEntries[0] ? parseFloat(weightEntries[0].weight) : null);
  const goalWeightNum = parseFloat(goalWeight) || null;

  let totalProgress = null;
  if (currentWeightNum !== null && startWeightNum !== null) {
    totalProgress = currentWeightNum - startWeightNum;
  }

  let progressToGoal = null;
  if (currentWeightNum !== null && goalWeightNum !== null) {
    progressToGoal = currentWeightNum - goalWeightNum;
  }

  let weeklyAverage = null;
  if (weightEntries.length > 0 && latestEntry) {
    const anchorDate = new Date(`${latestEntry.date}T${latestEntry.time || "00:00"}`);
    const cutoffTime = anchorDate.getTime() - 7 * 24 * 60 * 60 * 1000;
    const recentWeighins = weightEntries.filter((e) => {
      const ts = new Date(`${e.date}T${e.time || "00:00"}`).getTime();
      return ts >= cutoffTime;
    });
    if (recentWeighins.length > 0) {
      const sum = recentWeighins.reduce((s, e) => s + (parseFloat(e.weight) || 0), 0);
      weeklyAverage = sum / recentWeighins.length;
    }
  }

  const isMetric = measurementSystem === "metric";
  const weightUnit = isMetric ? "kg" : "lbs";
  const lengthUnit = isMetric ? "cm" : "in";
  const lengthSuffix = isMetric ? " cm" : '"';

  const formatWeightVal = (num: number | null) => {
    if (num === null || isNaN(num)) return "--";
    return `${num.toFixed(1)} ${weightUnit}`;
  };

  const formatProgressVal = (num: number | null) => {
    if (num === null || isNaN(num)) return "--";
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toFixed(1)} ${weightUnit}`;
  };

  const getMeasurementChips = (item: WeightLog) => {
    if (!showMeasurements) return [];
    return [
      item.bodyFat ? `BF ${item.bodyFat}%` : "",
      item.waist ? `Waist ${item.waist}${lengthSuffix}` : "",
      item.chest ? `Chest ${item.chest}${lengthSuffix}` : "",
      item.neck ? `Neck ${item.neck}${lengthSuffix}` : "",
      item.arm ? `Arm ${item.arm}${lengthSuffix}` : "",
      item.thigh ? `Thigh ${item.thigh}${lengthSuffix}` : "",
      ...customMeasurementLabels.map((label) =>
        item.customMeasurements?.[label] ? `${label} ${item.customMeasurements[label]}${lengthSuffix}` : ""
      ),
    ].filter(Boolean);
  };

  const showSettingsPage = mode === "full" && location.pathname.startsWith("/settings");
  const bodyTrackerSettingsCard = (
    <Card style={{ marginBottom: "20px" }}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Scale size={20} style={{ color: "var(--color-primary)" }} />
        Body Tracker Settings
      </h2>

      <div className="form-row-grid">
        <Input
          label={`Goal Weight (${weightUnit})`}
          type="number"
          inputMode="decimal"
          value={goalWeight}
          onChange={(e) => {
            setGoalWeight(e.target.value);
            updateSetting("tracker_goalWeight", e.target.value);
          }}
          placeholder="e.g. 175"
        />
        <Input
          label={`Start Weight (${weightUnit})`}
          type="number"
          inputMode="decimal"
          value={startWeight}
          onChange={(e) => {
            setStartWeight(e.target.value);
            updateSetting("tracker_startWeight", e.target.value);
          }}
          placeholder="e.g. 200"
        />
      </div>

      <div className="form-row-grid">
        <Select
          label="Measurement System"
          value={measurementSystem}
          onChange={(e) => {
            if (!isMeasurementSystem(e.target.value)) return;
            setMeasurementSystem(e.target.value);
            updateSetting("pref_measurementSystem", e.target.value);
          }}
          options={[
            { value: "imperial", label: "Imperial (lbs, inches)" },
            { value: "metric", label: "Metric (kg, cm)" },
          ]}
        />
        <Select
          label="Measurement Tracking"
          value={trackingMode}
          onChange={(e) => {
            if (!isTrackingMode(e.target.value)) return;
            setTrackingMode(e.target.value);
            updateSetting("tracker_mode", e.target.value);
          }}
          options={[
            { value: "weight", label: "Weight Only" },
            { value: "measurements", label: "Weight and Measurements" },
          ]}
        />
      </div>

      {showMeasurements && (
        <div style={{ marginTop: "12px" }}>
          <Input
            label="Custom Body Parts"
            type="text"
            value={customMeasurementInput}
            onChange={(e) => handleCustomMeasurementsChange(e.target.value)}
            placeholder="e.g. Chest, Arm, Waist"
          />
        </div>
      )}
    </Card>
  );

  return (
    <div className="fade-in" style={{ paddingBottom: "35px" }}>
      {mode === "full" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", margin: 0 }}>
            {showSettingsPage ? "Settings" : "Profile"}
          </h1>
        </div>
      )}

      {showSettingsPage ? (
        <>
          <Card style={{ marginBottom: "20px" }}>
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={20} style={{ color: "var(--color-primary)" }} />
                <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Install App</h2>
              </div>
              <Button variant="secondary" fullWidth onClick={() => setIsInstallHelpOpen(true)}>
                How to install
              </Button>
            </div>
          </Card>

          <Card style={{ marginBottom: "20px" }}>
            <Select
              label="Theme"
              value={theme}
              onChange={(e) => {
                if (!isAppTheme(e.target.value)) return;
                handleThemeChange(e.target.value);
              }}
              options={themeOptions}
            />
          </Card>

          <Card style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Cloud size={20} style={{ color: "var(--color-primary)" }} />
              Account & Cloud Sync
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px", lineHeight: 1.5 }}>
              {cloudUser
                ? `Signed in as ${cloudUser.email || cloudUser.displayName || "your account"}. Local data stays on this device unless you choose a sync action.`
                : "Local-only mode is active. You can keep using the app without an account, or sign in to back up and restore data."}
            </p>

            {!cloudUser ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Input
                  label="Email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Button variant="primary" onClick={handleEmailSignIn} disabled={isAuthBusy}>
                    <LogIn size={16} />
                    Sign In
                  </Button>
                  <Button variant="secondary" onClick={handleEmailCreateAccount} disabled={isAuthBusy}>
                    Create Account
                  </Button>
                </div>
                <Button variant="secondary" fullWidth onClick={handleGoogleSignIn} disabled={isAuthBusy}>
                  Continue with Google
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div className="badge">Local records: {totalLocalRecords}</div>
                  <div className="badge">Cloud records: {totalCloudRecords}</div>
                </div>

                {!cloudProfileExists && totalLocalRecords > 0 && (
                  <div
                    style={{
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      background: "rgba(245, 158, 11, 0.08)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "10px",
                      color: "var(--text-secondary)",
                      fontSize: "0.84rem",
                      lineHeight: 1.45,
                    }}
                  >
                    This account does not have a cloud backup yet. Upload this device when you are ready.
                  </div>
                )}

                <Button variant="secondary" fullWidth onClick={() => setIsSyncHelpOpen(true)}>
                  <HelpCircle size={16} />
                  Which sync action should I use?
                </Button>

                <Button variant="secondary" fullWidth onClick={handleCompareLocalAndCloud} disabled={isAuthBusy}>
                  Compare Device vs Account
                </Button>

                {cloudComparison && (
                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "10px",
                      background: "var(--bg-input)",
                    }}
                  >
                    {cloudComparison.map((item) => {
                      const hasDifferences = item.localOnly.length > 0 || item.cloudOnly.length > 0 || item.localCount !== item.cloudCount;
                      return (
                        <div key={item.collectionName} style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", color: "var(--text-primary)", fontWeight: 800 }}>
                            <span>{cloudCollectionLabels[item.collectionName] || item.collectionName}</span>
                            <span>
                              Device {item.localCount} / Account {item.cloudCount}
                            </span>
                          </div>
                          {hasDifferences && (
                            <div style={{ display: "grid", gap: "4px", marginTop: "5px" }}>
                              {item.cloudOnly.length > 0 && (
                                <div>
                                  Account only: {item.cloudOnly.slice(0, 4).map((record) => record.label).join(", ")}
                                  {item.cloudOnly.length > 4 ? `, plus ${item.cloudOnly.length - 4} more` : ""}
                                </div>
                              )}
                              {item.localOnly.length > 0 && (
                                <div>
                                  Device only: {item.localOnly.slice(0, 4).map((record) => record.label).join(", ")}
                                  {item.localOnly.length > 4 ? `, plus ${item.localOnly.length - 4} more` : ""}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Button variant="primary" onClick={handleUploadLocalToCloud} disabled={isAuthBusy}>
                    <Upload size={16} />
                    Upload Device
                  </Button>
                  <Button variant="secondary" onClick={handleRestoreCloudToLocal} disabled={isAuthBusy || totalCloudRecords === 0}>
                    <Download size={16} />
                    Restore Account
                  </Button>
                  <Button variant="secondary" onClick={handleMergeCloudIntoLocal} disabled={isAuthBusy || totalCloudRecords === 0}>
                    Merge Account
                  </Button>
                  <Button variant="secondary" onClick={handleSignOut} disabled={isAuthBusy}>
                    <LogOut size={16} />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

            {authMessage && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "12px", lineHeight: 1.45 }}>
                {authMessage}
              </p>
            )}
          </Card>

          {/* Preferences Section */}
          <Card style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings size={20} style={{ color: "var(--color-primary)" }} />
              Preferences & Settings
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <Select
                label="Layout"
                value={layoutMode}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "auto" || value === "mobile" || value === "desktop") {
                    handleLayoutModeChange(value);
                  }
                }}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "mobile", label: "Mobile" },
                  { value: "desktop", label: "Desktop" },
                ]}
              />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "6px" }}>
                Auto adjusts the layout based on the available screen width.
              </p>
            </div>
            
            <div className="form-row-grid">
              <Select
                label="Standard Syringe Size"
                value={standardSyringeSize}
                onChange={(e) => {
                  setStandardSyringeSize(e.target.value);
                  updateSetting("pref_syringeSize", e.target.value);
                }}
                options={[
                  { value: "0.3", label: "0.3 mL" },
                  { value: "0.5", label: "0.5 mL" },
                  { value: "1.0", label: "1.0 mL" },
                ]}
              />
              <Select
                label="Default Display Mode"
                value={syringeDisplayMode}
                onChange={(e) => {
                  if (!isDisplayMode(e.target.value)) return;
                  setSyringeDisplayMode(e.target.value);
                  updateSetting("pref_displayMode", e.target.value);
                }}
                options={[
                  { value: "units", label: "Syringe Units" },
                  { value: "mL", label: "mL Draw" },
                ]}
              />
            </div>

            <div className="form-row-grid">
              <Select
                label="Default Dosing Unit"
                value={standardDosingUnit}
                onChange={(e) => {
                  if (!isDosingUnit(e.target.value)) return;
                  setStandardDosingUnit(e.target.value);
                  updateSetting("pref_dosingUnit", e.target.value);
                }}
                options={[
                  { value: "mcg", label: "mcg" },
                  { value: "mg", label: "mg" },
                ]}
              />
              <Select
                label="Timezone Settings"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  updateSetting("pref_timezone", e.target.value);
                }}
                options={timezoneOptions}
              />
            </div>
          </Card>

          <Card style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={20} style={{ color: "var(--color-primary)" }} />
              Reminder Settings
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "14px", lineHeight: 1.5 }}>
              In-app reminders show when the app is open. Device notifications require browser permission and use each vial's injection time for before-dose alerts.
            </p>

            <div style={{ display: "grid", gap: "12px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 0.32fr) minmax(0, 1fr)",
                  gap: "10px",
                  alignItems: "start",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleInAppReminderChange(!inAppRemindersEnabled)}
                  className={`btn ${inAppRemindersEnabled ? "btn-success" : "btn-secondary"}`}
                  style={{ minHeight: "44px", padding: "9px 10px", justifyContent: "space-between" }}
                >
                  <span>In-App</span>
                  <span>{inAppRemindersEnabled ? "On" : "Off"}</span>
                </button>
                {inAppRemindersEnabled ? (
                  <Select
                    label="Show Due Within"
                    value={inAppReminderWindow}
                    onChange={(e) => {
                      if (!isInAppReminderWindow(e.target.value)) return;
                      handleInAppReminderWindowChange(e.target.value);
                    }}
                    options={[
                      { value: "24hour", label: "24 Hour" },
                      { value: "12hour", label: "12 Hour" },
                      { value: "3day", label: "3 Day" },
                    ]}
                  />
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.45, paddingTop: "10px" }}>
                    In-app reminder banner is off.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 0.32fr) minmax(0, 1fr)",
                  gap: "10px",
                  alignItems: "start",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeviceNotificationChange(!deviceNotificationsEnabled)}
                  className={`btn ${deviceNotificationsEnabled ? "btn-success" : "btn-secondary"}`}
                  style={{ minHeight: "44px", padding: "9px 10px", justifyContent: "space-between" }}
                >
                  <span>Device</span>
                  <span>
                    {notificationPermission === "unsupported"
                      ? "No"
                      : deviceNotificationsEnabled
                      ? "On"
                      : "Off"}
                  </span>
                </button>
                {deviceNotificationsEnabled ? (
                  <div className="form-row-grid">
                    <Select
                      label="First Alert"
                      value={devicePrimaryLead}
                      onChange={(e) => {
                        if (!isDeviceReminderLead(e.target.value)) return;
                        handleDevicePrimaryLeadChange(e.target.value);
                      }}
                      options={[
                        { value: "2hours", label: "2 Hours" },
                        { value: "1hour", label: "1 Hour" },
                        { value: "30min", label: "30 Minutes" },
                        { value: "15min", label: "15 Minutes" },
                      ]}
                    />
                    <Select
                      label="Second Alert"
                      value={deviceSecondaryLead}
                      onChange={(e) => {
                        if (!isSecondaryDeviceReminderLead(e.target.value)) return;
                        handleDeviceSecondaryLeadChange(e.target.value);
                      }}
                      options={[
                        { value: "none", label: "None" },
                        { value: "1hour", label: "1 Hour" },
                        { value: "30min", label: "30 Minutes" },
                        { value: "15min", label: "15 Minutes" },
                        { value: "atTime", label: "Time of Injection" },
                      ]}
                    />
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.45, paddingTop: "10px" }}>
                    Device notifications are off.
                  </p>
                )}
              </div>
            </div>

            {reminderMessage && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "10px", lineHeight: 1.45 }}>
                {reminderMessage}
              </p>
            )}
          </Card>

          <Card style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={20} style={{ color: "var(--color-primary)" }} />
              Backup & Export
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px", lineHeight: 1.5 }}>
              Local browser data can be lost if browser storage is cleared. Last backup: {lastBackupLabel}
            </p>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportBackupFile(file).finally(() => {
                    e.target.value = "";
                  });
                }
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Button variant="primary" onClick={handleExportBackup}>
                <Download size={16} />
                Backup JSON
              </Button>
              <Button variant="secondary" onClick={() => backupInputRef.current?.click()}>
                <Upload size={16} />
                Import Backup
              </Button>
              <Button variant="secondary" onClick={handleExportInjectionCsv}>
                <FileDown size={16} />
                Injection CSV
              </Button>
              <Button variant="secondary" onClick={handleExportWeightCsv}>
                <FileDown size={16} />
                Body CSV
              </Button>
            </div>
          </Card>

        </>
      ) : (
        <>
          {bodyTrackerSettingsCard}

          {/* Progress Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <div style={{ background: "var(--bg-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)", display: "block" }}>
                {formatWeightVal(currentWeightNum)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Current Weight</span>
            </div>
            
            <div style={{ background: "var(--bg-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color:
                    totalProgress === null
                      ? "var(--text-secondary)"
                      : totalProgress < 0
                      ? "var(--color-success)"
                      : totalProgress > 0
                      ? "var(--color-danger)"
                      : "var(--text-secondary)",
                  display: "block",
                }}
              >
                {formatProgressVal(totalProgress)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Progress</span>
            </div>

            <div style={{ background: "var(--bg-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color:
                    progressToGoal === null
                      ? "var(--text-secondary)"
                      : progressToGoal <= 0
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                  display: "block",
                }}
              >
                {formatProgressVal(progressToGoal)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Remaining to Goal</span>
            </div>

            <div style={{ background: "var(--bg-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-info)", display: "block" }}>
                {formatWeightVal(weeklyAverage)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>7-Day Average</span>
            </div>
          </div>

          {/* Weigh-in form */}
          <Card style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Scale size={18} style={{ color: "var(--color-primary)" }} />
              Log Daily Progress
            </h3>

            <form onSubmit={handleAddWeighIn} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="form-row-grid">
                <Input
                  label="Date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={newWeighTime}
                  onChange={(e) => setNewWeighTime(e.target.value)}
                />
              </div>

              <Input
                label={`Weight (${weightUnit})`}
                type="number"
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="e.g. 180.4"
                required
                suffix={weightUnit}
              />

              {showMeasurements && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span className="form-label" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Measurements</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <Input label="Body Fat %" type="number" inputMode="decimal" value={newBodyFat} onChange={(e) => setNewBodyFat(e.target.value)} placeholder="%" />
                    <Input label="Waist" type="number" inputMode="decimal" value={newWaist} onChange={(e) => setNewWaist(e.target.value)} placeholder={lengthUnit} />
                    <Input label="Chest" type="number" inputMode="decimal" value={newChest} onChange={(e) => setNewChest(e.target.value)} placeholder={lengthUnit} />
                    <Input label="Neck" type="number" inputMode="decimal" value={newNeck} onChange={(e) => setNewNeck(e.target.value)} placeholder={lengthUnit} />
                    <Input label="Arm" type="number" inputMode="decimal" value={newArm} onChange={(e) => setNewArm(e.target.value)} placeholder={lengthUnit} />
                    <Input label="Thigh" type="number" inputMode="decimal" value={newThigh} onChange={(e) => setNewThigh(e.target.value)} placeholder={lengthUnit} />
                  </div>

                  {customMeasurementLabels.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {customMeasurementLabels.map((label) => (
                        <Input
                          key={label}
                          label={label}
                          type="number"
                          inputMode="decimal"
                          value={newCustomMeasurements[label] || ""}
                          onChange={(e) =>
                            setNewCustomMeasurements((prev) => ({ ...prev, [label]: e.target.value }))
                          }
                          placeholder={lengthUnit}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Notes"
                type="text"
                value={newEntryNotes}
                onChange={(e) => setNewEntryNotes(e.target.value)}
                placeholder="e.g. post-workout, fasted"
              />

              <Button type="submit" variant="primary" fullWidth style={{ marginTop: "8px" }}>
                <Plus size={16} />
                Add Progress Entry
              </Button>
            </form>
          </Card>

          {/* History Log */}
          <Card>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
              Progress History
            </h3>

            {logs && logs.length > 0 && (
              <WeightChart entries={logs} goalWeight={goalWeightNum} weightUnit={weightUnit} />
            )}

            {logs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>
                No progress entries logged yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {logs.map((item) => {
                  const measurementChips = getMeasurementChips(item);
                  const isEditing = editingEntryId === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--border-radius-sm)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {parseFloat(item.weight).toFixed(1)} {weightUnit}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                            {item.date} • {item.time}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => setEditingEntryId(isEditing ? null : item.id)}
                            aria-label={isEditing ? `Close editing ${item.date}` : `Edit entry ${item.date}`}
                            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                          >
                            {isEditing ? <X size={14} /> : <Edit2 size={14} />}
                          </button>
                          <button
                            onClick={() => setEntryToDelete(item)}
                            aria-label={`Delete entry ${item.date}`}
                            style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "4px" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Logged tags and notes */}
                      {measurementChips.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {measurementChips.map((c) => (
                            <span
                              key={c}
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "0.7rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          Note: {item.notes}
                        </p>
                      )}

                      {/* Inline edit panel */}
                      {isEditing && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "10px",
                            borderTop: "1px solid var(--border-color)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <div className="form-row-grid">
                            <Input label="Date" type="date" value={item.date || ""} onChange={(e) => handleUpdateEntryField(item.id, "date", e.target.value)} />
                            <Input label="Time" type="time" value={item.time || ""} onChange={(e) => handleUpdateEntryField(item.id, "time", e.target.value)} />
                          </div>
                          
                          <Input
                            label={`Weight (${weightUnit})`}
                            type="number"
                            inputMode="decimal"
                            value={item.weight || ""}
                            onChange={(e) => handleUpdateEntryField(item.id, "weight", e.target.value)}
                            suffix={weightUnit}
                          />

                          {showMeasurements && (
                            <>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                                <Input label="Body Fat %" type="number" inputMode="decimal" value={item.bodyFat || ""} onChange={(e) => handleUpdateEntryField(item.id, "bodyFat", e.target.value)} />
                                <Input label="Waist" type="number" inputMode="decimal" value={item.waist || ""} onChange={(e) => handleUpdateEntryField(item.id, "waist", e.target.value)} placeholder={lengthUnit} />
                                <Input label="Chest" type="number" inputMode="decimal" value={item.chest || ""} onChange={(e) => handleUpdateEntryField(item.id, "chest", e.target.value)} placeholder={lengthUnit} />
                                <Input label="Neck" type="number" inputMode="decimal" value={item.neck || ""} onChange={(e) => handleUpdateEntryField(item.id, "neck", e.target.value)} placeholder={lengthUnit} />
                                <Input label="Arm" type="number" inputMode="decimal" value={item.arm || ""} onChange={(e) => handleUpdateEntryField(item.id, "arm", e.target.value)} placeholder={lengthUnit} />
                                <Input label="Thigh" type="number" inputMode="decimal" value={item.thigh || ""} onChange={(e) => handleUpdateEntryField(item.id, "thigh", e.target.value)} placeholder={lengthUnit} />
                              </div>

                              {customMeasurementLabels.map((label) => (
                                <Input
                                  key={label}
                                  label={label}
                                  type="number"
                                  inputMode="decimal"
                                  value={item.customMeasurements?.[label] || ""}
                                  onChange={(e) => handleUpdateCustomEntryField(item.id, label, e.target.value)}
                                  placeholder={lengthUnit}
                                />
                              ))}
                            </>
                          )}

                          <Input label="Notes" type="text" value={item.notes || ""} onChange={(e) => handleUpdateEntryField(item.id, "notes", e.target.value)} />

                          <Button variant="success" fullWidth onClick={() => setEditingEntryId(null)}>
                            <Save size={14} />
                            Done Editing
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Delete confirmation modal */}
      {entryToDelete && (
        <div className="modal-overlay" onClick={() => setEntryToDelete(null)}>
          <div className="modal-content">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-danger)", marginBottom: "16px" }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: "1.15rem" }}>Delete Entry?</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Are you sure you want to delete the weigh-in log for <strong>{entryToDelete.date}</strong>?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="secondary" fullWidth onClick={() => setEntryToDelete(null)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleDeleteEntry}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {showSettingsPage && isInstallHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsInstallHelpOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", margin: 0 }}>How to install</h3>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setIsInstallHelpOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h4 style={{ fontSize: "1rem", marginBottom: "8px" }}>Android</h4>
                <ol
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    paddingLeft: "20px",
                  }}
                >
                  <li>Open this app in Chrome.</li>
                  <li>Tap the three-dot menu.</li>
                  <li>Tap Add to Home screen or Install app.</li>
                  <li>Confirm Install.</li>
                </ol>
              </div>

              <div>
                <h4 style={{ fontSize: "1rem", marginBottom: "8px" }}>iPhone or iPad</h4>
                <ol
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    paddingLeft: "20px",
                  }}
                >
                  <li>Open this app in Safari.</li>
                  <li>Tap the Share button.</li>
                  <li>Choose Add to Home Screen.</li>
                  <li>Tap Add.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsPage && isSyncHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsSyncHelpOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Sync guide</h3>
              <button
                type="button"
                aria-label="Close sync guide"
                onClick={() => setIsSyncHelpOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                {
                  title: "Added or changed something on this device",
                  action: "Tap Upload Device here, then tap Merge Account on the other device.",
                },
                {
                  title: "Added or changed something on another device",
                  action: "On that device, tap Upload Device. Then come back here and tap Merge Account.",
                },
                {
                  title: "Deleted something and want the other device to match",
                  action: "On the device where you deleted it, tap Upload Device. On the other device, tap Restore Account.",
                },
                {
                  title: "This device should exactly match the account",
                  action: "Tap Restore Account. This replaces this device's local records with the account records.",
                },
                {
                  title: "Both devices may have useful local changes",
                  action: "Upload the device you trust most first. On the other device, tap Merge Account before uploading it back.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--border-radius-sm)",
                    padding: "12px",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <h4 style={{ fontSize: "0.98rem", marginBottom: "6px" }}>{item.title}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    {item.action}
                  </p>
                </div>
              ))}

              <div
                style={{
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  background: "rgba(245, 158, 11, 0.08)",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  color: "var(--text-secondary)",
                  fontSize: "0.86rem",
                  lineHeight: 1.5,
                }}
              >
                Restore Account is the only current option that removes local records that were deleted somewhere else. Use it after uploading the device where the deletion happened.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
