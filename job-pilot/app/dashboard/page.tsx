import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("@/components/DashboardClient").then((mod) => mod.DashboardClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Loading dashboard...
          </div>
        </div>
      </div>
    ),
  },
);

export default function DashboardPage() {
  return <DashboardClient />;
}
