// Local profile shown in the sidebar and header. There is no login in Phase 1.
// Override in frontend/.env.local, e.g. NEXT_PUBLIC_USER_NAME="Nived P S".
export const profile = {
  name: process.env.NEXT_PUBLIC_USER_NAME || "Vestadz Team",
  role: process.env.NEXT_PUBLIC_USER_ROLE || "Local admin",
  department: process.env.NEXT_PUBLIC_USER_DEPARTMENT || "Marketing Analytics",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
