import {
  booleanFilter,
  defineDateRangeContract,
  dimensionFilter,
} from "@altertable/data-app/contract";
export const calendar = defineDateRangeContract({
  minDate: "2025-04-16",
  maxRangeDays: 730,
  timeZone: "UTC",
  completeDays: false,
});
export const hasApps = booleanFilter({
  key: "hasApps",
  label: "Has data apps",
  presentation: { prominence: "secondary" },
});

export const organization = dimensionFilter<string>({
  key: "organization",
  label: "Workspace",
  valueType: "string",
  selectionMode: "single",
  facet: { operation: "workspace-options", input: () => ({}) },
});
