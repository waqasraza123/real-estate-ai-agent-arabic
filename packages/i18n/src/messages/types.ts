export interface AppSection {
  name: string;
  phaseLabel: string;
  shellNote: string;
}

export interface NavigationSection {
  landing: string;
  dashboard: string;
  leads: string;
  manager: string;
  qa: string;
}

export interface WorkspaceSummarySection {
  title: string;
  summary: string;
}

export interface LandingSection {
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction: string;
  secondaryAction: string;
  spotlightTitle: string;
  spotlightSummary: string;
  liveAlphaTitle: string;
  liveAlphaSummary: string;
}

export interface CommonSection {
  switchLanguage: string;
  operatorRole: string;
  accessKey: string;
  applyRole: string;
  roleGuardNote: string;
  skipToContent: string;
  primaryNavigation: string;
  demoState: string;
  languagePreference: string;
  lead: string;
  currentOwner: string;
  nextAction: string;
  lastChange: string;
  timeline: string;
  documents: string;
  visitReadiness: string;
  handoverReadiness: string;
  stage: string;
  customer: string;
  automation: string;
  manager: string;
  placeholderNotice: string;
  notActive: string;
  backToDashboard: string;
  backToCommandCenter: string;
  openHandover: string;
  openQaRecord: string;
}

export interface RolesSection {
  sales_manager: string;
  handover_coordinator: string;
  handover_manager: string;
  qa_reviewer: string;
  admin: string;
}

export interface StatesSection {
  loadingTitle: string;
  loadingSummary: string;
  errorTitle: string;
  errorSummary: string;
  retry: string;
  emptyAlertsTitle: string;
  emptyAlertsSummary: string;
  emptyCasesTitle: string;
  emptyCasesSummary: string;
  emptyMessagesTitle: string;
  emptyMessagesSummary: string;
  emptyDocumentsTitle: string;
  emptyDocumentsSummary: string;
  emptyTimelineTitle: string;
  emptyTimelineSummary: string;
  emptyMilestonesTitle: string;
  emptyMilestonesSummary: string;
}

export interface ValidationSection {
  generic: string;
}

export interface ErrorsSection {
  genericAction: string;
  liveServicesUnavailable: string;
  localRoleRequired: string;
}

export interface FormsSection {
  pendingCreate: string;
  pendingSave: string;
  pendingSend: string;
  pendingUpdate: string;
  pendingStart: string;
  pendingComplete: string;
  pendingApprove: string;
  pendingPrepare: string;
  pendingSchedule: string;
  updateAction: string;
  alreadyStarted: string;
  alreadyCompleted: string;
  waitingForScheduling: string;
  waitingForExecution: string;
  leadCapture: {
    customerNamePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    projectInterestPlaceholder: string;
    budgetPlaceholder: string;
    messagePlaceholder: string;
    preferredLanguageAr: string;
    preferredLanguageEn: string;
  };
  visitScheduling: {
    locationPlaceholder: string;
  };
}

export interface ActionMessagesSection {
  qualificationSaved: string;
  visitScheduled: string;
  automationPaused: string;
  automationResumed: string;
  documentUpdated: string;
  handoverTaskUpdated: string;
  handoverExecutionStarted: string;
  handoverExecutionBlocked: string;
  handoverCompleted: string;
  handoverCompletionBlocked: string;
}

export interface AppMessages {
  app: AppSection;
  navigation: NavigationSection;
  landing: LandingSection;
  dashboard: WorkspaceSummarySection;
  leads: WorkspaceSummarySection;
  profile: WorkspaceSummarySection;
  conversation: WorkspaceSummarySection;
  schedule: WorkspaceSummarySection;
  documents: WorkspaceSummarySection;
  handover: WorkspaceSummarySection;
  manager: WorkspaceSummarySection;
  qa: WorkspaceSummarySection;
  common: CommonSection;
  roles: RolesSection;
  states: StatesSection;
  validation: ValidationSection;
  errors: ErrorsSection;
  forms: FormsSection;
  actions: ActionMessagesSection;
}
