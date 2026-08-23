import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings/settings-view";

export default function SettingsPage() {
  return (
    <AppShell>
      <h1 className="font-serif text-2xl">Settings</h1>
      <SettingsView />
    </AppShell>
  );
}
