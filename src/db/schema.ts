export type LayoutMode = "auto" | "mobile" | "desktop";
export type AppTheme =
  | "light"
  | "dark"
  | "professional"
  | "fun"
  | "cottonCandySkies"
  | "electropop"
  | "urbanGraffiti";

export type AppSettings = {
  id: "main";
  disclaimerAccepted: boolean;
  layoutMode: LayoutMode;
  theme: AppTheme;
};

export type AppSettingValue = string | number | boolean | string[] | Record<string, string | number | boolean>;

export interface AppSetting {
  key: string;
  id?: string;
  value: AppSettingValue;
  disclaimerAccepted?: boolean;
  layoutMode?: LayoutMode;
  theme?: AppTheme;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}
