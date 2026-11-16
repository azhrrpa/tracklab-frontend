import {
  BadgeCheck,
  Ban,
  Beaker,
  Bell,
  Building2,
  Calendar,
  Check,
  CircleCheck,
  CircleDot,
  CircleX,
  ClipboardCheck,
  Dna,
  Clock,
  FileCheck,
  FilePlus,
  FileSignature,
  FileText,
  FileUp,
  FlaskConical,
  Hash,
  Hourglass,
  Mail,
  Microscope,
  PackageCheck,
  Receipt,
  Send,
  TestTube,
  Truck,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon for a tracker step. The API stores icon names in mixed styles (seen in real data:
 * "fa-check", "CheckCircle2", "check"), so names are normalised to kebab-case and matched
 * against lucide and Font Awesome style aliases. Unknown names fall back to a dot.
 */
const icons: Record<string, LucideIcon> = {
  check: Check,
  "check-circle": CircleCheck,
  "check-circle-2": CircleCheck,
  "circle-check": CircleCheck,
  "circle-check-big": CircleCheck,
  "square-check": CircleCheck,
  "badge-check": BadgeCheck,
  "check-double": BadgeCheck,
  "file-plus": FilePlus,
  "file-circle-plus": FilePlus,
  "file-text": FileText,
  "file-lines": FileText,
  "file-invoice": Receipt,
  "file-invoice-dollar": Receipt,
  receipt: Receipt,
  "file-up": FileUp,
  "file-arrow-up": FileUp,
  "file-upload": FileUp,
  upload: Upload,
  "file-check": FileCheck,
  "file-signature": FileSignature,
  "file-pen": FileSignature,
  "clipboard-check": ClipboardCheck,
  send: Send,
  "paper-plane": Send,
  truck: Truck,
  "truck-fast": Truck,
  "shipping-fast": Truck,
  hash: Hash,
  hashtag: Hash,
  barcode: Hash,
  "package-check": PackageCheck,
  "box-open": PackageCheck,
  box: PackageCheck,
  hourglass: Hourglass,
  "hourglass-half": Hourglass,
  "hourglass-start": Hourglass,
  clock: Clock,
  calendar: Calendar,
  "calendar-check": Calendar,
  "flask-conical": FlaskConical,
  flask: FlaskConical,
  vial: FlaskConical,
  vials: FlaskConical,
  beaker: Beaker,
  "test-tube": TestTube,
  microscope: Microscope,
  dna: Dna,
  envelope: Mail,
  mail: Mail,
  bell: Bell,
  user: User,
  building: Building2,
  ban: Ban,
  "circle-x": CircleX,
  "x-circle": CircleX,
  "circle-xmark": CircleX,
};

/** "CheckCircle2" -> "check-circle-2", "fa-solid fa-truck" -> "truck", "fas fa-check" -> "check". */
export function normalizeIconName(name: string | null | undefined) {
  if (!name) return null;
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => !/^(fa|fas|far|fal|fad|fab|fa-(solid|regular|light|duotone|brands|thin))$/i.test(part));
  const last = parts.pop();
  if (!last) return null;
  return last
    .replace(/^fa[srldb]?-/i, "")
    .replace(/([a-z])([A-Z0-9])/g, "$1-$2")
    .replace(/([0-9])([A-Za-z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

export function resolveIcon(name: string | null | undefined): LucideIcon {
  const key = normalizeIconName(name);
  return (key && icons[key]) || CircleDot;
}

function iconElement(name: string | null | undefined, className: string) {
  const Icon = resolveIcon(name);
  return <Icon className={className} aria-hidden />;
}

export function TrackerIcon({ name, className = "h-4 w-4" }: { name: string | null | undefined; className?: string }) {
  return (
    <span className="inline-flex text-slate-700" title={name ?? undefined}>
      {iconElement(name, className)}
      <span className="sr-only">{name ?? "no icon"}</span>
    </span>
  );
}
