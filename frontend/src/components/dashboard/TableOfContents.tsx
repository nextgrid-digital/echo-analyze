import { cn } from "@/lib/utils"

interface Section {
  id: string
  title: string
  category: string
  items?: string[]
}

interface TableOfContentsProps {
  sections: Section[]
  activeSection?: string
}

export function TableOfContents({ sections, activeSection = "" }: TableOfContentsProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 100 // Offset for sticky header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  return (
    <aside className="hidden xl:block w-64 flex-shrink-0">
      <div className="sticky top-4">
        <div className="bg-card border border-border rounded-none p-5">
          <h3 className="text-xs font-bold text-foreground mb-5 uppercase tracking-widest">
            Table of Contents
          </h3>
          <nav className="space-y-0.5">
            {sections.map((section) => (
              <div key={section.id} className="mb-3 last:mb-0">
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleClick(e, section.id)}
                  className={cn(
                    "block text-sm font-semibold transition-all duration-200 py-1.5 px-2 rounded-md -mx-2",
                    activeSection === section.id
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:text-primary hover:bg-accent/50"
                  )}
                >
                  {section.title}
                </a>
                {section.items && section.items.length > 0 && (
                  <ul className="mt-1.5 ml-2 space-y-0.5">
                    {section.items.map((item, index) => (
                      <li key={index}>
                        <a
                          href={`#${section.id}-${item.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={(e) => {
                            e.preventDefault()
                            // Map item names to actual IDs
                            const itemIdMap: Record<string, string> = {
                              "concentration": "portfolio-structure-concentration",
                              "asset allocation": "portfolio-structure-asset-allocation",
                              "equity deep dive": "performance-analysis-equity-deep-dive",
                              "performance summary": "performance-analysis-performance-summary",
                              "portfolio summary": "overview",
                            }
                            const normalizedItem = item.toLowerCase().trim()
                            const itemId = itemIdMap[normalizedItem] || `${section.id}-${normalizedItem.replace(/\s+/g, "-")}`
                            const element = document.getElementById(itemId)
                            if (element) {
                              const offset = 100
                              const elementPosition = element.getBoundingClientRect().top
                              const offsetPosition = elementPosition + window.pageYOffset - offset
                              window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth",
                              })
                            }
                          }}
                          className={cn(
                            "block text-xs transition-all duration-200 py-1 px-2 rounded-md -mx-2",
                            activeSection === section.id
                              ? "text-primary/90 font-medium"
                              : "text-muted-foreground hover:text-primary hover:bg-accent/30"
                          )}
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}
