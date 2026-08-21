import BrandMark from "../components/BrandMark";
import LoggerForm from "../components/LoggerForm";

export default function LoggerPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-navy via-brand-blue to-brand-indigo">
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="animate-fade-in-up rounded-2xl bg-white p-5 shadow-brand ring-1 ring-black/5 sm:p-6">
            <div className="mb-5 flex justify-center border-b border-slate-100 pb-5">
              <BrandMark
                iconClassName="h-12 sm:h-14"
                wordmarkClassName="text-xl sm:text-2xl"
                taglineClassName="text-xs sm:text-sm"
              />
            </div>
            <LoggerForm />
          </div>

          <p className="mt-5 text-center text-xs text-white/50">
            InspiringPG &middot; Inspiring Passion and Grit
          </p>
        </div>
      </main>
    </div>
  );
}
