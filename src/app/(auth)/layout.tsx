import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#f5f5f5] lg:grid-cols-12">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#fffdf4] via-[#fff7cc] to-[#f5f5f5] px-10 py-12 text-[#111111] lg:col-span-4 lg:block">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#f4c400]/30 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#111111]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.9),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(244,196,0,0.2),transparent_50%)]" />
        <Image
          src="/auth-bag.png"
          alt="BFL shopping bag"
          width={540}
          height={788}
          className="pointer-events-none absolute -bottom-24 right-[-130px] z-0 w-[82%] max-w-[430px] rotate-[-13deg] opacity-95"
        />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <Image
              src="/bfl-logo.png"
              alt="BFL Feed Management Tool"
              width={288}
              height={67}
              className="w-full max-w-[224px]"
            />
            <h2 className="mt-12 text-3xl font-bold leading-tight text-[#111111]">
              Smarter Product Feed Operations
            </h2>
            <p className="mt-4 max-w-sm text-sm text-[#111111]/80">
              Keep your product feed accurate across channels with scheduled XML sync, validation,
              and export workflows.
            </p>
          </div>
          <p className="text-xs text-[#111111]/60">BFL Group color theme with focused feed operations UI.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 lg:col-span-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
