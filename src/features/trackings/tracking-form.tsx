"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { companyName } from "@/features/requests/request-helpers";
import { fromDateInput, toDateInput } from "@/lib/format";
import type { LabRequest, Tracker, Tracking } from "@/lib/types";

export type TrackingFormResult = {
  body: {
    trackerId: string;
    trackerCode: string;
    requestId: string;
    partnerId: string;
    value: string | null;
  };
  /** Also copy the step's description into the request's "Last Status". */
  updateLastStatus: boolean;
};

type TrackingFormDialogProps = {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (result: TrackingFormResult) => void;
  tracking: Tracking | null;
  /** Fixed request (detail page) or a list to choose from (tracking list page). */
  request?: LabRequest | null;
  requests?: LabRequest[];
  /** Fixed step (timeline) or a list to choose from. */
  tracker?: Tracker | null;
  trackers: Tracker[];
};

export function TrackingFormDialog(props: TrackingFormDialogProps) {
  const { open, onClose, saving, tracking, tracker } = props;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tracking ? "Edit tracking" : tracker ? `Record "${tracker.description}"` : "Add tracking"}
      description="A tracking marks that a request has reached a step."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="tracking-form" loading={saving}>
            {tracking ? "Save changes" : "Save tracking"}
          </Button>
        </>
      }
    >
      <TrackingForm key={`${tracking?.id ?? "new"}-${tracker?.id ?? ""}-${props.request?.id ?? ""}`} {...props} />
    </Modal>
  );
}

function TrackingForm({ onSubmit, tracking, request, requests = [], tracker, trackers }: TrackingFormDialogProps) {
  const [requestId, setRequestId] = useState(tracking?.requestId ?? request?.id ?? "");
  const [trackerId, setTrackerId] = useState(tracking?.trackerId ?? tracker?.id ?? "");
  const selectedTracker = tracker ?? trackers.find((t) => t.id === trackerId) ?? null;
  const selectedRequest = request ?? requests.find((r) => r.id === requestId) ?? null;
  const actionType = selectedTracker?.actionType ?? "none";

  const [value, setValue] = useState(() =>
    actionType === "date" ? toDateInput(tracking?.value) || toDateInput(new Date().toISOString()) : (tracking?.value ?? ""),
  );
  const [updateLastStatus, setUpdateLastStatus] = useState(!tracking);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sortedTrackers = [...trackers].sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!selectedRequest) next.request = "Choose a request";
    if (!selectedTracker) next.tracker = "Choose a step";
    if (actionType !== "none" && !value.trim()) next.value = "This step needs a value";
    if (value.length > 1000) next.value = "Value is too long (max 1000)";
    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedRequest || !selectedTracker) return;

    onSubmit({
      body: {
        trackerId: selectedTracker.id,
        trackerCode: selectedTracker.code,
        requestId: selectedRequest.id,
        partnerId: tracking?.partnerId ?? selectedRequest.partnerId,
        value: actionType === "none" ? null : actionType === "date" ? fromDateInput(value) : value.trim(),
      },
      updateLastStatus,
    });
  };

  return (
    <form id="tracking-form" noValidate onSubmit={submit} className="space-y-4">
      {!request && (
        <Field label="Request" htmlFor="tracking-request" required error={errors.request}>
          <Select id="tracking-request" value={requestId} onChange={(e) => setRequestId(e.target.value)} aria-invalid={Boolean(errors.request)}>
            <option value="">Choose a request…</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.projectCode} · {companyName(r)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {!tracker && (
        <Field label="Step" htmlFor="tracking-tracker" required error={errors.tracker}>
          <Select
            id="tracking-tracker"
            value={trackerId}
            onChange={(e) => {
              setTrackerId(e.target.value);
              setValue("");
            }}
            aria-invalid={Boolean(errors.tracker)}
          >
            <option value="">Choose a step…</option>
            {sortedTrackers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.order}. {t.description} ({t.code})
              </option>
            ))}
          </Select>
        </Field>
      )}

      {selectedTracker && actionType !== "none" && (
        <Field
          label={actionType === "date" ? "Date" : actionType === "file" ? "File" : "Value"}
          htmlFor="tracking-value"
          required
          error={errors.value}
          hint={actionType === "file" ? "File name or link to the document" : undefined}
        >
          <Input
            id="tracking-value"
            type={actionType === "date" ? "date" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(errors.value)}
            placeholder={actionType === "file" ? "quotation-PRJ-250623.pdf" : undefined}
          />
        </Field>
      )}

      {selectedTracker && actionType === "none" && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">This step doesn&apos;t need a value. Saving marks it as reached.</p>
      )}

      {selectedTracker && (
        <Checkbox
          id="tracking-update-status"
          label={`Set the request's Last Status to "${selectedTracker.description}"`}
          checked={updateLastStatus}
          onChange={(e) => setUpdateLastStatus(e.target.checked)}
        />
      )}
    </form>
  );
}
