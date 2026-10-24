import { SiteNav } from "@/components/SiteNav";
import { DemoShell } from "@/components/demo/DemoShell";

export default function DemoPage() {
  return (
    <>
      <SiteNav active="demo" />
      <main className="relative z-10">
        <DemoShell />
      </main>
    </>
  );
}
