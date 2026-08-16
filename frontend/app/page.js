import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">MentorBridge</h1>
      <p className="max-w-xl text-gray-600">
        Connecting students with volunteer mentors for accessible, equitable academic support.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
