export default function CornerCircles() {
  return (
    <>
      <div className="pointer-events-none absolute left-[-4px] top-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute right-[-4px] top-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute bottom-[-4px] right-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
      <div className="pointer-events-none absolute bottom-[-4px] left-[-4px] z-50 size-3 rounded-full bg-primary-variant p-2 text-background outline-2 outline-muted" />
    </>
  );
}
