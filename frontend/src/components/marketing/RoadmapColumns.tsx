interface RoadmapColumnsProps {
  today: readonly string[]
  tomorrow: readonly string[]
}

export function RoadmapColumns({ today, tomorrow }: RoadmapColumnsProps) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
      <div>
        <p className="text-label text-muted-foreground">Today</p>
        <ul className="mt-4 space-y-3">
          {today.map((item) => (
            <li key={item} className="text-lg font-medium tracking-tight sm:text-xl">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-label text-muted-foreground">Tomorrow</p>
        <ul className="mt-4 space-y-3">
          {tomorrow.map((item) => (
            <li
              key={item}
              className="text-lg font-medium tracking-tight text-muted-foreground sm:text-xl"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
