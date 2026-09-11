"use client";

export function LogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  };
  return (
    <button
      onClick={logout}
      className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-teal-50/85 transition hover:bg-white/15 hover:text-white"
    >
      Log out
    </button>
  );
}
