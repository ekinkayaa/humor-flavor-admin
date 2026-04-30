import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin && !profile?.is_matrix_admin)
    redirect("/login?error=unauthorized");

  const name = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar email={profile.email} name={name} />
      <main
        style={{ flex: 1, background: "var(--bg)", overflowY: "auto" }}
      >
        {children}
      </main>
    </div>
  );
}
