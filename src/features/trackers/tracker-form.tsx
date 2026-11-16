"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useAllResource } from "@/hooks/use-resource";
import type { Tracker } from "@/lib/types";

export const ACTION_TYPES = [
  { value: "none", label: "None", hint: "No input needed" },
  { value: "text", label: "Text", hint: "A short text, e.g. a project code" },
  { value: "file", label: "File", hint: "A document, e.g. a quotation or PO" },
  { value: "date", label: "Date", hint: "A date, e.g. when the sample was sent" },
] as const;

// Shared data contains lowercase codes too (e.g. "dika"), so lowercase is accepted;
// new trackers are uppercased on create to follow the REQ-CREATE convention.
const codePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
/** Empty input -> null. Also handles the null default values react-hook-form passes in. */
const optionalText = (value: string | null | undefined) => (value == null || value.trim() === "" ? null : value);
const optionalNumber = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));

export const trackerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50, "Code is too long (max 50)")
    .regex(codePattern, "Use letters, numbers, '-', '_' or '.' only (e.g. REQ-CREATE)"),
  parentCode: z.string().trim().max(50).nullable(),
  description: z.string().trim().min(1, "Description is required").max(255, "Description is too long (max 255)"),
  actionType: z.string().min(1, "Choose an action type"),
  moduleFlow: z.string().trim().min(1, "Module flow is required").max(20),
  icon: z.string().trim().max(100).nullable(),
  order: z.number({ error: "Order must be a number" }).int("Whole numbers only").min(0, "Must be 0 or more").max(9999),
  mandays: z.number({ error: "Mandays must be a number" }).int("Whole numbers only").min(0).max(3650).nullable(),
  isParallel: z.boolean(),
  isPublic: z.boolean(),
  isUsingNotification: z.boolean(),
  isActive: z.boolean(),
});

export type TrackerFormValues = z.infer<typeof trackerSchema>;

/** New trackers follow the uppercase convention; existing codes are kept exactly as stored. */
export function normalizeNewTracker(values: TrackerFormValues): TrackerFormValues {
  return { ...values, code: values.code.toUpperCase(), moduleFlow: values.moduleFlow.toUpperCase() };
}

export function toTrackerFormValues(tracker?: Tracker | null): TrackerFormValues {
  return {
    code: tracker?.code ?? "",
    parentCode: tracker?.parentCode ?? null,
    description: tracker?.description ?? "",
    actionType: tracker?.actionType ?? "none",
    moduleFlow: tracker?.moduleFlow ?? "CA",
    icon: tracker?.icon ?? null,
    order: tracker?.order ?? 0,
    mandays: tracker?.mandays ?? null,
    isParallel: tracker?.isParallel ?? false,
    isPublic: tracker?.isPublic ?? true,
    isUsingNotification: tracker?.isUsingNotification ?? false,
    isActive: tracker?.isActive ?? true,
  };
}

type TrackerFormDialogProps = {
  open: boolean;
  tracker: Tracker | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TrackerFormValues) => void;
};

export function TrackerFormDialog({ open, tracker, saving, onClose, onSubmit }: TrackerFormDialogProps) {
  const isEdit = Boolean(tracker);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit tracker ${tracker?.code}` : "Add tracker"}
      description="A tracker is one step a lab analysis request goes through."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="tracker-form" loading={saving}>
            {isEdit ? "Save changes" : "Create tracker"}
          </Button>
        </>
      }
    >
      {/* key resets the form whenever a different tracker is opened */}
      <TrackerForm key={tracker?.id ?? "new"} tracker={tracker} onSubmit={onSubmit} />
    </Modal>
  );
}

function TrackerForm({ tracker, onSubmit }: { tracker: Tracker | null; onSubmit: (values: TrackerFormValues) => void }) {
  const { data: allTrackers = [] } = useAllResource<Tracker>("trackers");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerSchema),
    defaultValues: toTrackerFormValues(tracker),
  });

  const parentOptions = allTrackers
    .filter((t) => t.id !== tracker?.id && t.code !== tracker?.code)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.code.localeCompare(b.code));
  const actionType = useWatch({ control, name: "actionType" });
  const err = (name: keyof TrackerFormValues) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `tracker-${name}-error` : undefined,
  });

  return (
    <form id="tracker-form" noValidate onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Code" htmlFor="tracker-code" required error={errors.code?.message} hint={tracker ? "Changing the code can break steps that use it as parent" : "Saved in uppercase, e.g. SAMPLE-SENT"}>
        <Input id="tracker-code" className={tracker ? "font-mono" : "font-mono uppercase"} placeholder="REQ-CREATE" {...err("code")} {...register("code")} />
      </Field>

      <Field label="Parent code" htmlFor="tracker-parentCode" error={errors.parentCode?.message} hint="The step that comes before this one">
        <Select
          id="tracker-parentCode"
          {...err("parentCode")}
          {...register("parentCode", { setValueAs: optionalText })}
        >
          <option value="">— None (first step) —</option>
          {parentOptions.map((t) => (
            <option key={t.id} value={t.code}>
              {t.code} · {t.description}
            </option>
          ))}
          {tracker?.parentCode && !parentOptions.some((t) => t.code === tracker.parentCode) && (
            <option value={tracker.parentCode}>{tracker.parentCode}</option>
          )}
        </Select>
      </Field>

      <Field label="Description" htmlFor="tracker-description" required error={errors.description?.message} className="sm:col-span-2">
        <Textarea id="tracker-description" rows={2} placeholder="Sample Sent" {...err("description")} {...register("description")} />
      </Field>

      <Field
        label="Action type"
        htmlFor="tracker-actionType"
        required
        error={errors.actionType?.message}
        hint={ACTION_TYPES.find((a) => a.value === actionType)?.hint}
      >
        <Select id="tracker-actionType" {...err("actionType")} {...register("actionType")}>
          {ACTION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
          {tracker && !ACTION_TYPES.some((a) => a.value === tracker.actionType) && (
            <option value={tracker.actionType}>{tracker.actionType}</option>
          )}
        </Select>
      </Field>

      <Field label="Module flow" htmlFor="tracker-moduleFlow" required error={errors.moduleFlow?.message} hint="e.g. CA">
        <Input id="tracker-moduleFlow" {...err("moduleFlow")} {...register("moduleFlow")} />
      </Field>

      <Field label="Order" htmlFor="tracker-order" required error={errors.order?.message} hint="Position in the flow (0 = first)">
        <Input id="tracker-order" type="number" min={0} {...err("order")} {...register("order", { valueAsNumber: true })} />
      </Field>

      <Field label="Mandays" htmlFor="tracker-mandays" error={errors.mandays?.message} hint="Working days this step usually takes">
        <Input id="tracker-mandays" type="number" min={0} placeholder="-" {...err("mandays")} {...register("mandays", { setValueAs: optionalNumber })} />
      </Field>

      <Field label="Icon" htmlFor="tracker-icon" error={errors.icon?.message} hint="Icon name shown in the timeline" className="sm:col-span-2">
        <Input id="tracker-icon" placeholder="truck" {...err("icon")} {...register("icon", { setValueAs: optionalText })} />
      </Field>

      <fieldset className="grid grid-cols-1 gap-1 rounded-md border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium text-slate-700">Options</legend>
        <Checkbox id="tracker-isParallel" label="Parallel" description="Can run alongside other steps" {...register("isParallel")} />
        <Checkbox id="tracker-isPublic" label="Public" description="Visible to the customer" {...register("isPublic")} />
        <Checkbox id="tracker-isUsingNotification" label="Notification" description="Notify when this step is reached" {...register("isUsingNotification")} />
        {tracker && <Checkbox id="tracker-isActive" label="Active" description="Inactive trackers are hidden" {...register("isActive")} />}
      </fieldset>
    </form>
  );
}
