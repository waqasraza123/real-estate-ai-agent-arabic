import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApiApp } from "./app";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";

describe("lead capture api", () => {
  let store: Awaited<ReturnType<typeof createAlphaLeadCaptureStore>>;
  let app: ReturnType<typeof buildApiApp>;

  beforeEach(async () => {
    store = await createAlphaLeadCaptureStore({
      inMemory: true
    });
    app = buildApiApp({
      store
    });
  });

  afterEach(async () => {
    await app.close();
    await store.close();
  });

  it("creates a persisted website lead case with seeded document requests", async () => {
    const response = await app.inject({
      method: "POST",
      payload: {
        budget: "USD 650,000",
        customerName: "Aisha Rahman",
        email: "aisha@example.com",
        message: "Looking for a three-bedroom apartment and can visit this weekend.",
        phone: "+1-555-0100",
        preferredLocale: "en",
        projectInterest: "Sunrise Residences"
      },
      url: "/v1/website-leads"
    });

    expect(response.statusCode).toBe(201);

    const createdCase = response.json();

    expect(createdCase.stage).toBe("new");
    expect(createdCase.source).toBe("website");
    expect(createdCase.ownerName).toBe("Revenue Ops Queue");
    expect(createdCase.followUpStatus).toBe("on_track");
    expect(createdCase.automationStatus).toBe("active");

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().documentRequests).toHaveLength(3);
    expect(detailResponse.json().managerInterventions).toHaveLength(0);
    expect(detailResponse.json().handoverCase).toBeNull();
  });

  it("promotes a document-complete case into controlled handover execution and completion", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Omar Haddad",
        email: "omar@example.com",
        message: "Need an Arabic-speaking follow-up for a family home search.",
        preferredLocale: "ar",
        projectInterest: "Palm Horizon"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const qualificationResponse = await app.inject({
      method: "POST",
      payload: {
        budgetBand: "SAR 1.9M to 2.2M",
        intentSummary: "Family buyer with high intent and flexible weekend availability.",
        moveInTimeline: "Within 60 days",
        readiness: "high"
      },
      url: `/v1/cases/${createdCase.caseId}/qualification`
    });

    expect(qualificationResponse.statusCode).toBe(200);
    expect(qualificationResponse.json().stage).toBe("qualified");

    const visitResponse = await app.inject({
      method: "POST",
      payload: {
        location: "Palm Horizon Discovery Center",
        scheduledAt: "2026-04-15T12:30:00.000Z"
      },
      url: `/v1/cases/${createdCase.caseId}/visits`
    });

    expect(visitResponse.statusCode).toBe(200);

    const documentRequests = visitResponse.json().documentRequests;

    for (const documentRequest of documentRequests) {
      const documentResponse = await app.inject({
        method: "PATCH",
        payload: {
          status: "accepted"
        },
        url: `/v1/cases/${createdCase.caseId}/documents/${documentRequest.documentRequestId}`
      });

      expect(documentResponse.statusCode).toBe(200);
    }

    const handoverIntakeResponse = await app.inject({
      method: "POST",
      payload: {
        ownerName: "Handover Desk Riyadh",
        readinessSummary: "Documents are accepted and the case is ready to start internal handover readiness."
      },
      url: `/v1/cases/${createdCase.caseId}/handover-intake`
    });

    expect(handoverIntakeResponse.statusCode).toBe(200);
    expect(handoverIntakeResponse.json().stage).toBe("handover_initiated");
    expect(handoverIntakeResponse.json().handoverCase.status).toBe("pending_readiness");

    const handoverCaseId = handoverIntakeResponse.json().handoverCase.handoverCaseId;

    const handoverDetailResponse = await app.inject({
      method: "GET",
      url: `/v1/handover-cases/${handoverCaseId}`
    });

    expect(handoverDetailResponse.statusCode).toBe(200);
    expect(handoverDetailResponse.json().appointment).toBeNull();
    expect(handoverDetailResponse.json().tasks).toHaveLength(3);
    expect(handoverDetailResponse.json().milestones).toHaveLength(3);
    expect(handoverDetailResponse.json().customerUpdates).toHaveLength(3);

    const firstTaskId = handoverDetailResponse.json().tasks[0]?.taskId;
    const readinessMilestoneId = handoverDetailResponse.json().milestones[0]?.milestoneId;
    const readinessCustomerUpdateId = handoverDetailResponse.json().customerUpdates[0]?.customerUpdateId;
    const schedulingMilestoneId = handoverDetailResponse.json().milestones.find(
      (milestone: { type: string }) => milestone.type === "customer_scheduling_window"
    )?.milestoneId;
    const schedulingInviteId = handoverDetailResponse.json().customerUpdates.find(
      (customerUpdate: { type: string }) => customerUpdate.type === "scheduling_invite"
    )?.customerUpdateId;
    const appointmentHoldMilestoneId = handoverDetailResponse.json().milestones.find(
      (milestone: { type: string }) => milestone.type === "handover_appointment_hold"
    )?.milestoneId;
    const appointmentConfirmationId = handoverDetailResponse.json().customerUpdates.find(
      (customerUpdate: { type: string }) => customerUpdate.type === "appointment_confirmation"
    )?.customerUpdateId;

    const taskUpdateResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "blocked"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${firstTaskId}`
    });

    expect(taskUpdateResponse.statusCode).toBe(200);
    expect(taskUpdateResponse.json().status).toBe("internal_tasks_open");
    expect(taskUpdateResponse.json().tasks[0]?.status).toBe("blocked");

    const earlyCustomerApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
    });

    expect(earlyCustomerApprovalResponse.statusCode).toBe(409);
    expect(earlyCustomerApprovalResponse.json().error).toBe("handover_customer_update_not_ready");

    const earlyAppointmentPlanResponse = await app.inject({
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment`
    });

    expect(earlyAppointmentPlanResponse.statusCode).toBe(409);
    expect(earlyAppointmentPlanResponse.json().error).toBe("handover_scheduling_boundary_not_approved");

    const milestoneUpdateResponse = await app.inject({
      method: "PATCH",
      payload: {
        ownerName: "Customer Care Desk",
        status: "ready",
        targetAt: "2026-04-18T09:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${readinessMilestoneId}`
    });

    expect(milestoneUpdateResponse.statusCode).toBe(200);
    expect(
      milestoneUpdateResponse.json().milestones.find((milestone: { milestoneId: string }) => milestone.milestoneId === readinessMilestoneId)?.status
    ).toBe("ready");
    expect(
      milestoneUpdateResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === readinessCustomerUpdateId
      )?.status
    ).toBe("ready_for_approval");

    const customerApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
    });

    expect(customerApprovalResponse.statusCode).toBe(200);
    expect(
      customerApprovalResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === readinessCustomerUpdateId
      )?.status
    ).toBe("approved");

    const firstTaskCompletionResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "complete"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${firstTaskId}`
    });

    expect(firstTaskCompletionResponse.statusCode).toBe(200);

    const remainingTaskIds = handoverDetailResponse
      .json()
      .tasks.filter((task: { taskId: string }) => task.taskId !== firstTaskId)
      .map((task: { taskId: string }) => task.taskId);

    for (const taskId of remainingTaskIds) {
      const taskCompleteResponse = await app.inject({
        method: "PATCH",
        payload: {
          status: "complete"
        },
        url: `/v1/handover-cases/${handoverCaseId}/tasks/${taskId}`
      });

      expect(taskCompleteResponse.statusCode).toBe(200);
    }

    const schedulingMilestoneResponse = await app.inject({
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${schedulingMilestoneId}`
    });

    expect(schedulingMilestoneResponse.statusCode).toBe(200);
    expect(
      schedulingMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === schedulingInviteId
      )?.status
    ).toBe("ready_for_approval");

    const schedulingApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${schedulingInviteId}`
    });

    expect(schedulingApprovalResponse.statusCode).toBe(200);
    expect(schedulingApprovalResponse.json().status).toBe("customer_scheduling_ready");

    const appointmentPlanResponse = await app.inject({
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment`
    });

    expect(appointmentPlanResponse.statusCode).toBe(200);
    expect(appointmentPlanResponse.json().appointment.status).toBe("planned");
    expect(appointmentPlanResponse.json().appointment.location).toBe("Palm Horizon Tower A");

    const plannedAppointmentId = appointmentPlanResponse.json().appointment.appointmentId;

    const earlyAppointmentConfirmationResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment/${plannedAppointmentId}/confirmation`
    });

    expect(earlyAppointmentConfirmationResponse.statusCode).toBe(409);
    expect(earlyAppointmentConfirmationResponse.json().error).toBe("handover_appointment_confirmation_not_approved");

    const appointmentHoldMilestoneResponse = await app.inject({
      method: "PATCH",
      payload: {
        ownerName: "Project Ops",
        status: "ready",
        targetAt: "2026-04-21T09:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${appointmentHoldMilestoneId}`
    });

    expect(appointmentHoldMilestoneResponse.statusCode).toBe(200);
    expect(
      appointmentHoldMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("ready_for_approval");

    const appointmentBoundaryApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}`
    });

    expect(appointmentBoundaryApprovalResponse.statusCode).toBe(200);

    const appointmentConfirmationResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment/${plannedAppointmentId}/confirmation`
    });

    expect(appointmentConfirmationResponse.statusCode).toBe(200);
    expect(appointmentConfirmationResponse.json().appointment.status).toBe("internally_confirmed");

    const earlyDispatchReadyResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/dispatch-ready`
    });

    expect(earlyDispatchReadyResponse.statusCode).toBe(409);
    expect(earlyDispatchReadyResponse.json().error).toBe("handover_delivery_preparation_required");

    const deliveryPreparationResponse = await app.inject({
      method: "PATCH",
      payload: {
        deliverySummary: "Arabic WhatsApp confirmation copy is prepared for manual dispatch after final ops review.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/delivery`
    });

    expect(deliveryPreparationResponse.statusCode).toBe(200);
    expect(
      deliveryPreparationResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("prepared_for_delivery");

    const earlyExecutionBlockerResponse = await app.inject({
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "open",
        summary: "Attempt to log a snag before the handover record is promoted into the scheduled boundary.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers`
    });

    expect(earlyExecutionBlockerResponse.statusCode).toBe(409);
    expect(earlyExecutionBlockerResponse.json().error).toBe("handover_execution_not_ready");

    const dispatchReadyResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/dispatch-ready`
    });

    expect(dispatchReadyResponse.statusCode).toBe(200);
    expect(dispatchReadyResponse.json().status).toBe("scheduled");
    expect(
      dispatchReadyResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("ready_to_dispatch");

    const blockerCreateResponse = await app.inject({
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "open",
        summary: "Two unit snag items remain unresolved at the apartment entrance and bathroom fit-out.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers`
    });

    expect(blockerCreateResponse.statusCode).toBe(201);
    expect(blockerCreateResponse.json().blockers).toHaveLength(1);
    expect(blockerCreateResponse.json().blockers[0]?.status).toBe("open");

    const blockerId = blockerCreateResponse.json().blockers[0]?.blockerId;

    const earlyExecutionStartResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${handoverCaseId}/execution`
    });

    expect(earlyExecutionStartResponse.statusCode).toBe(409);
    expect(earlyExecutionStartResponse.json().error).toBe("handover_execution_blockers_open");

    const blockerProgressResponse = await app.inject({
      method: "PATCH",
      payload: {
        dueAt: "2026-04-22T12:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "in_progress",
        summary: "The snag crew is actively addressing the entrance and bathroom fit-out issues."
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`
    });

    expect(blockerProgressResponse.statusCode).toBe(200);
    expect(blockerProgressResponse.json().blockers[0]?.status).toBe("in_progress");

    const blockerResolvedResponse = await app.inject({
      method: "PATCH",
      payload: {
        dueAt: "2026-04-22T15:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "warning",
        status: "resolved",
        summary: "The unit snag list was cleared and the final walkthrough notes were closed."
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`
    });

    expect(blockerResolvedResponse.statusCode).toBe(200);
    expect(blockerResolvedResponse.json().blockers[0]?.status).toBe("resolved");

    const earlyCompletionResponse = await app.inject({
      method: "PATCH",
      payload: {
        completionSummary: "Attempt to complete the handover before execution has started on the live record.",
        status: "completed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/completion`
    });

    expect(earlyCompletionResponse.statusCode).toBe(409);
    expect(earlyCompletionResponse.json().error).toBe("handover_completion_not_ready");

    const earlyReviewResponse = await app.inject({
      method: "PATCH",
      payload: {
        outcome: "accepted",
        summary: "Attempt to save the post-handover review before the execution state has been completed."
      },
      url: `/v1/handover-cases/${handoverCaseId}/review`
    });

    expect(earlyReviewResponse.statusCode).toBe(409);
    expect(earlyReviewResponse.json().error).toBe("handover_review_not_ready");

    const executionStartResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${handoverCaseId}/execution`
    });

    expect(executionStartResponse.statusCode).toBe(200);
    expect(executionStartResponse.json().status).toBe("in_progress");
    expect(executionStartResponse.json().executionStartedAt).not.toBeNull();

    const completionResponse = await app.inject({
      method: "PATCH",
      payload: {
        completionSummary: "Keys were released, the final walkthrough was acknowledged, and the live handover record is now complete.",
        status: "completed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/completion`
    });

    expect(completionResponse.statusCode).toBe(200);
    expect(completionResponse.json().status).toBe("completed");
    expect(completionResponse.json().completedAt).not.toBeNull();
    expect(completionResponse.json().completionSummary).toContain("final walkthrough");

    const earlyPostCompletionFollowUpResponse = await app.inject({
      method: "PATCH",
      payload: {
        dueAt: "2026-04-23T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "Attempt to open aftercare follow-up before the review marks follow-up as required."
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`
    });

    expect(earlyPostCompletionFollowUpResponse.statusCode).toBe(409);
    expect(earlyPostCompletionFollowUpResponse.json().error).toBe("handover_follow_up_not_required");

    const reviewResponse = await app.inject({
      method: "PATCH",
      payload: {
        outcome: "follow_up_required",
        summary: "Customer requested one more aftercare check for access-card configuration after key release."
      },
      url: `/v1/handover-cases/${handoverCaseId}/review`
    });

    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json().review.outcome).toBe("follow_up_required");

    const followUpResponse = await app.inject({
      method: "PATCH",
      payload: {
        dueAt: "2026-04-23T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "Confirm the access-card configuration and close the final customer aftercare point."
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`
    });

    expect(followUpResponse.statusCode).toBe(200);
    expect(followUpResponse.json().postCompletionFollowUp.status).toBe("open");

    const followUpId = followUpResponse.json().postCompletionFollowUp.followUpId;

    const resolveFollowUpResponse = await app.inject({
      method: "PATCH",
      payload: {
        resolutionSummary: "Access cards were configured correctly and the customer confirmed that the aftercare issue is closed.",
        status: "resolved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up/${followUpId}`
    });

    expect(resolveFollowUpResponse.statusCode).toBe(200);
    expect(resolveFollowUpResponse.json().postCompletionFollowUp.status).toBe("resolved");
    expect(resolveFollowUpResponse.json().postCompletionFollowUp.resolutionSummary).toContain("Access cards");

    const refreshedCaseResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(refreshedCaseResponse.statusCode).toBe(200);
    expect(refreshedCaseResponse.json().handoverCase.status).toBe("completed");
  }, 50000);

  it("rejects invalid payloads and invalid handover promotion attempts", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "X",
        email: "invalid-email"
      },
      url: "/v1/website-leads"
    });

    expect(createResponse.statusCode).toBe(400);

    const liveCaseResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Layal Abbas",
        email: "layal@example.com",
        message: "Need a bilingual callback later today.",
        preferredLocale: "ar",
        projectInterest: "Palm Horizon"
      },
      url: "/v1/website-leads"
    });

    const createdCase = liveCaseResponse.json();

    const invalidAutomationResponse = await app.inject({
      method: "POST",
      payload: {
        status: "stopped"
      },
      url: `/v1/cases/${createdCase.caseId}/automation`
    });

    expect(invalidAutomationResponse.statusCode).toBe(400);

    const earlyHandoverResponse = await app.inject({
      method: "POST",
      payload: {
        readinessSummary: "Attempt to skip document completion."
      },
      url: `/v1/cases/${createdCase.caseId}/handover-intake`
    });

    expect(earlyHandoverResponse.statusCode).toBe(409);
    expect(earlyHandoverResponse.json().error).toBe("documents_incomplete_for_handover");
  });
});
