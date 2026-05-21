import EasyPipsShell from "../components/EasyPipsShell";
import AIHeroBanner from "../components/AIHeroBanner";

export default function Page() {
  return (
    <>
      <div className="xl:pl-[280px] px-5 pt-5">
        <AIHeroBanner />
      </div>

      <EasyPipsShell page="dashboard" />
    </>
  );
}
