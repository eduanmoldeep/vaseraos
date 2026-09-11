"use client";

export function LogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  };
  return (
    <button
      onClick={logout}
      className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
    >
      Log out
    </button>
  );
}
