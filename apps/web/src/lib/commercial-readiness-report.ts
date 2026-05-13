import type { CommercialEvidenceGap, CommercialSourceSummary } from "@real-estate-ai/contracts";

export interface CommercialEvidenceGapPressureGroup {
  activeSourceCount: number;
  gapCount: number;
  label: string;
  openRefreshTasksCount: number;
  pendingApprovalsCount: number;
}

export interface CommercialEvidenceGapPressureSummary {
  openGapCount: number;
  openGapProjectCount: number;
  ownerGroups: CommercialEvidenceGapPressureGroup[];
  projectGroups: CommercialEvidenceGapPressureGroup[];
  sourceOwnerCount: number;
  topOwnerGroup: CommercialEvidenceGapPressureGroup | null;
  topProjectGroup: CommercialEvidenceGapPressureGroup | null;
  unassignedGapCount: number;
}

export function buildCommercialEvidenceGapPressureSummary(input: {
  gaps: CommercialEvidenceGap[];
  sources: CommercialSourceSummary[];
}): CommercialEvidenceGapPressureSummary {
  const openGaps = input.gaps.filter((gap) => gap.status === "open");
  const sourcesByProject = new Map<string, CommercialSourceSummary[]>();

  for (const source of input.sources) {
    const sources = sourcesByProject.get(source.projectCode) ?? [];

    sources.push(source);
    sourcesByProject.set(source.projectCode, sources);
  }

  const projectGroups = Array.from(new Set(openGaps.map((gap) => gap.projectCode)))
    .map((projectCode) => {
      const projectSources = sourcesByProject.get(projectCode) ?? [];

      return {
        activeSourceCount: projectSources.length,
        gapCount: openGaps.filter((gap) => gap.projectCode === projectCode).length,
        label: projectCode,
        openRefreshTasksCount: projectSources.reduce((total, source) => total + source.openRefreshTasksCount, 0),
        pendingApprovalsCount: projectSources.reduce((total, source) => total + source.pendingProposalsCount, 0)
      };
    })
    .sort(compareCommercialEvidenceGapPressureGroups);

  const ownerKeys = new Set<string>();

  for (const gap of openGaps) {
    const projectSources = sourcesByProject.get(gap.projectCode) ?? [];
    const ownerNames = [...new Set(projectSources.map((source) => source.ownerName).filter((ownerName): ownerName is string => Boolean(ownerName)))];

    if (ownerNames.length === 0) {
      ownerKeys.add("Unassigned");
    } else {
      for (const ownerName of ownerNames) {
        ownerKeys.add(ownerName);
      }
    }
  }

  const ownerGroups = Array.from(ownerKeys)
    .map((ownerName) => {
      const ownerSources = input.sources.filter((source) => (ownerName === "Unassigned" ? source.ownerName === null : source.ownerName === ownerName));
      const ownerProjectCodes = new Set(ownerSources.map((source) => source.projectCode));
      const ownerGapCount =
        ownerName === "Unassigned"
          ? openGaps.filter((gap) => {
              const projectSources = sourcesByProject.get(gap.projectCode) ?? [];

              return projectSources.every((source) => source.ownerName === null);
            }).length
          : openGaps.filter((gap) => ownerProjectCodes.has(gap.projectCode)).length;

      return {
        activeSourceCount: ownerSources.length,
        gapCount: ownerGapCount,
        label: ownerName,
        openRefreshTasksCount: ownerSources.reduce((total, source) => total + source.openRefreshTasksCount, 0),
        pendingApprovalsCount: ownerSources.reduce((total, source) => total + source.pendingProposalsCount, 0)
      };
    })
    .filter((group) => group.gapCount > 0)
    .sort(compareCommercialEvidenceGapPressureGroups);

  return {
    openGapCount: openGaps.length,
    openGapProjectCount: projectGroups.length,
    ownerGroups,
    projectGroups,
    sourceOwnerCount: new Set(
      input.sources.map((source) => source.ownerName).filter((ownerName): ownerName is string => Boolean(ownerName))
    ).size,
    topOwnerGroup: ownerGroups[0] ?? null,
    topProjectGroup: projectGroups[0] ?? null,
    unassignedGapCount: ownerGroups.find((group) => group.label === "Unassigned")?.gapCount ?? 0
  };
}

function compareCommercialEvidenceGapPressureGroups(
  left: CommercialEvidenceGapPressureGroup,
  right: CommercialEvidenceGapPressureGroup
) {
  return (
    right.gapCount - left.gapCount ||
    right.pendingApprovalsCount - left.pendingApprovalsCount ||
    right.openRefreshTasksCount - left.openRefreshTasksCount ||
    left.label.localeCompare(right.label)
  );
}
