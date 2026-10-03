/** A quiet placeholder while an article loads: the page's shape, no pulsing. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-10 sm:px-10" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 rounded bg-hover" />
      <div className="mt-3 h-7 w-2/3 rounded bg-hover" />
      <div className="mt-4 h-4 w-full max-w-xl rounded bg-hover" />
      <div className="mt-10 flex flex-col gap-3">
        {[92, 84, 96, 70, 88].map((w) => (
          <div key={w} className="h-3.5 rounded bg-hover" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
