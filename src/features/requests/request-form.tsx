"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useAllResource } from "@/hooks/use-resource";
import { fromDateInput, toDateInput } from "@/lib/format";
import type { LabRequest, Tracker } from "@/lib/types";
import { partnerOptions } from "@/features/requests/request-helpers";

const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const optionalNumber = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));
/** Empty input -> null. Also handles the null default values react-hook-form passes in. */
const optionalText = (value: string | null | undefined) => (value == null || value.trim() === "" ? null : value);

export const requestSchema = z
  .object({
    partnerId: z.string().trim().regex(guid, "Choose a company or enter a valid partner ID"),
    projectCode: z.string().trim().min(1, "Project code is required").max(50, "Project code is too long (max 50)"),
    totalFee: z.number({ error: "Total fee must be a number" }).min(0, "Total fee cannot be negative").max(1_000_000_000_000),
    lastStatus: z.string().trim().max(100).nullable(),
    receivingStatus: z.string().trim().max(255).nullable(),
    leadTime: z.number({ error: "Lead time must be a number" }).int("Whole days only").min(0).max(100_000).nullable(),
    receivedDate: z.string().nullable(),
    analysisWipDate: z.string().nullable(),
    analysisCompletedDate: z.string().nullable(),
    isActive: z.boolean(),
  })
  .refine((v) => !v.analysisWipDate || !v.analysisCompletedDate || v.analysisCompletedDate >= v.analysisWipDate, {
    message: "Completed date cannot be before the start date",
    path: ["analysisCompletedDate"],
  });

export type RequestFormValues = z.infer<typeof requestSchema>;

export function toRequestFormValues(request?: LabRequest | null): RequestFormValues {
  return {
    partnerId: request?.partnerId ?? "",
    projectCode: request?.projectCode ?? "",
    totalFee: request?.totalFee ?? 0,
    lastStatus: request?.lastStatus ?? null,
    receivingStatus: request?.receivingStatus ?? null,
    leadTime: request?.leadTime ?? null,
    receivedDate: toDateInput(request?.receivedDate) || null,
    analysisWipDate: toDateInput(request?.analysisWipDate) || null,
    analysisCompletedDate: toDateInput(request?.analysisCompletedDate) || null,
    isActive: request?.isActive ?? true,
  };
}

/** Converts form values to the API body (dates as ISO strings). */
export function toRequestBody(values: RequestFormValues, includeIsActive: boolean) {
  const { isActive, ...rest } = values;
  return {
    ...rest,
    receivedDate: fromDateInput(rest.receivedDate),
    analysisWipDate: fromDateInput(rest.analysisWipDate),
    analysisCompletedDate: fromDateInput(rest.analysisCompletedDate),
    ...(includeIsActive ? { isActive } : {}),
  };
}

type RequestFormDialogProps = {
  open: boolean;
  request: LabRequest | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: RequestFormValues) => void;
};

export function RequestFormDialog({ open, request, saving, onClose, onSubmit }: RequestFormDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={request ? `Edit request ${request.projectCode}` : "Add lab analysis request"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="request-form" loading={saving}>
            {request ? "Save changes" : "Create request"}
          </Button>
        </>
      }
    >
      <RequestForm key={request?.id ?? "new"} request={request} onSubmit={onSubmit} />
    </Modal>
  );
}

function RequestForm({ request, onSubmit }: { request: LabRequest | null; onSubmit: (values: RequestFormValues) => void }) {
  const { data: allRequests = [] } = useAllResource<LabRequest>("requests");
  const { data: trackers = [] } = useAllResource<Tracker>("trackers");
  const partners = partnerOptions(allRequests);
  const knownPartner = !request || partners.some((p) => p.id === request.partnerId);
  const [manualPartner, setManualPartner] = useState(!knownPartner);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: toRequestFormValues(request),
  });

  const err = (name: keyof RequestFormValues) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `request-${name}-error` : undefined,
  });

  const statusOptions = [...new Set(["Not sent yet", ...[...trackers].sort((a, b) => a.order - b.order).map((t) => t.description)])];

  return (
    <form id="request-form" noValidate onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Company"
        htmlFor="request-partnerId"
        required
        error={errors.partnerId?.message}
        className="sm:col-span-2"
        hint={manualPartner ? "Paste the partner's ID (GUID)" : undefined}
      >
        {manualPartner || partners.length === 0 ? (
          <Input id="request-partnerId" className="font-mono" placeholder="93f25c4d-f903-b587-9671-66d4fb302c67" {...err("partnerId")} {...register("partnerId")} />
        ) : (
          <Select id="request-partnerId" {...err("partnerId")} {...register("partnerId")}>
            <option value="">Choose a company…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {partners.length > 0 && (
          <Checkbox
            id="request-manual-partner"
            label="Enter partner ID manually"
            checked={manualPartner}
            onChange={(e) => setManualPartner(e.target.checked)}
            className="mt-1"
          />
        )}
      </Field>

      <Field label="Project code" htmlFor="request-projectCode" required error={errors.projectCode?.message}>
        <Input id="request-projectCode" placeholder="PRJ-250623" {...err("projectCode")} {...register("projectCode")} />
      </Field>

      <Field label="Total fee (Rp)" htmlFor="request-totalFee" required error={errors.totalFee?.message}>
        <Input id="request-totalFee" type="number" min={0} step="0.01" {...err("totalFee")} {...register("totalFee", { valueAsNumber: true })} />
      </Field>

      <Field label="Last status" htmlFor="request-lastStatus" error={errors.lastStatus?.message} hint="Pick a step or type your own">
        <Input id="request-lastStatus" list="request-status-options" {...err("lastStatus")} {...register("lastStatus", { setValueAs: optionalText })} />
        <datalist id="request-status-options">
          {statusOptions.map((status) => (
            <option key={status} value={status} />
          ))}
        </datalist>
      </Field>

      <Field label="Receiving status" htmlFor="request-receivingStatus" error={errors.receivingStatus?.message}>
        <Input id="request-receivingStatus" placeholder="Not received yet" {...err("receivingStatus")} {...register("receivingStatus", { setValueAs: optionalText })} />
      </Field>

      <Field label="Received date" htmlFor="request-receivedDate" error={errors.receivedDate?.message}>
        <Input id="request-receivedDate" type="date" {...register("receivedDate", { setValueAs: (v: string | null) => v || null })} />
      </Field>

      <Field label="Lead time (days)" htmlFor="request-leadTime" error={errors.leadTime?.message}>
        <Input id="request-leadTime" type="number" min={0} placeholder="-" {...err("leadTime")} {...register("leadTime", { setValueAs: optionalNumber })} />
      </Field>

      <Field label="Analysis started" htmlFor="request-analysisWipDate" error={errors.analysisWipDate?.message}>
        <Input id="request-analysisWipDate" type="date" {...register("analysisWipDate", { setValueAs: (v: string | null) => v || null })} />
      </Field>

      <Field label="Analysis completed" htmlFor="request-analysisCompletedDate" error={errors.analysisCompletedDate?.message}>
        <Input
          id="request-analysisCompletedDate"
          type="date"
          {...err("analysisCompletedDate")}
          {...register("analysisCompletedDate", { setValueAs: (v: string | null) => v || null })}
        />
      </Field>

      {request && (
        <Checkbox id="request-isActive" label="Active" description="Inactive requests are hidden from lists" className="sm:col-span-2" {...register("isActive")} />
      )}
    </form>
  );
}
