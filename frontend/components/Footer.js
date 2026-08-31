export default function Footer() {
  return (
    <footer className="border-t border-[#1a2e28] px-6 py-8 text-sm">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-[#39C5BB] to-[#ff6fb4] bg-clip-text font-semibold text-transparent">
            MentorBridge
          </span>
          <span className="text-[#6f8981]">· free peer mentoring, in support of SDG 4: Quality Education</span>
        </div>
        <p className="text-[#6f8981]">&copy; {new Date().getFullYear()} MentorBridge. All rights reserved.</p>
      </div>
    </footer>
  );
}
