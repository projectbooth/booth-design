/**
 * Small inline icon set for shell chrome. Line-style SVGs matching the wireframe's
 * visual language (1.3px strokes, 18px default box). Not a general icon library —
 * modules render their own icons via the manifest's free-form `icon` field falling
 * back to Fallback here (contracts/module-manifest.md: "Unrecognized values fall back
 * to a default glyph").
 */
import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      {...props}
    />
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2 8 9 2l7 6" />
      <rect x="4" y="8" width="10" height="8" />
    </Icon>
  );
}

export function StoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="14" height="14" rx="3" />
      <path d="M9 5.5v7M5.5 9h7" />
    </Icon>
  );
}

export function BuildIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="3" cy="9" r="1.9" fill="currentColor" stroke="none" />
      <path d="M5.2 9h2.8" />
      <circle cx="9" cy="9" r="1.9" fill="currentColor" stroke="none" />
      <path d="M11.2 9h2.8" />
      <circle cx="15" cy="9" r="1.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="14" height="3" rx="1" />
      <rect x="2" y="7.5" width="14" height="3" rx="1" />
      <rect x="2" y="12" width="14" height="3" rx="1" />
    </Icon>
  );
}

export function ManageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="14" height="14" rx="2" />
      <path d="M5 7h8M5 10.5h5" />
    </Icon>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="2.4" />
      <path d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M13.8 4.2l-1.4 1.4M5.6 12.4l-1.4 1.4" />
    </Icon>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" {...props}>
      <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function FallbackModuleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="12" height="12" rx="2.5" />
    </Icon>
  );
}
