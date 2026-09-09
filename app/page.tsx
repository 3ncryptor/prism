export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6">
      <main className="flex max-w-xl flex-col items-start gap-4 text-left">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Prism
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
          Explainable resume-to-JD matching
        </h1>
        <p className="text-lg leading-8 text-muted">
          Every fit score is traceable to the evidence behind it — built for
          placement cells that need to know why, not just how much.
        </p>
      </main>
    </div>
  );
}
