import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MosaicTile {
  label: string
  content: ReactNode
}

interface ProductMosaicProps {
  tiles: readonly MosaicTile[]
}

export function ProductMosaic({ tiles }: ProductMosaicProps) {
  return (
    <div className="marketing-product-mosaic">
      {tiles.map((tile) => (
        <div key={tile.label} className="marketing-mosaic-tile min-w-0">
          <p className="text-label mb-3 text-muted-foreground">{tile.label}</p>
          <div className={cn("min-w-0")}>{tile.content}</div>
        </div>
      ))}
    </div>
  )
}
