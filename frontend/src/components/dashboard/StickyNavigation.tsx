import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Section {
  id: string
  label: string
}

const sections: Section[] = [
  { id: "executive-summary", label: "Executive Summary" },
  { id: "risk-performance", label: "Risk & Performance" },
  { id: "portfolio-health", label: "Portfolio Health" },
  { id: "cost-tax-analysis", label: "Cost & Tax" },
  { id: "fixed-income", label: "Fixed Income" },
  { id: "key-observations", label: "Key Observations" },
  { id: "detailed-holdings", label: "Holdings" },
  { id: "notes-feedback", label: "Notes" },
]

export function StickyNavigation() {
  const [activeSection, setActiveSection] = useState<string>("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150 // Offset for sticky header
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // Show navigation when scrolled past first section
      setIsVisible(scrollPosition > 200)

      // Find the current active section
      let current = ""
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id)
        if (section) {
          const rect = section.getBoundingClientRect()
          if (rect.top <= 150) {
            current = sections[i].id
            break
          }
        }
      }

      // If scrolled to bottom, highlight last section
      if (scrollPosition + windowHeight >= documentHeight - 50) {
        current = sections[sections.length - 1].id
      }

      setActiveSection(current)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100 // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  if (!isVisible) return null

  return (
    <nav
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden xl:block"
      aria-label="Section navigation"
    >
      <div className="bg-card border border-border/50 rounded-none shadow-lg p-2">
        <div className="flex flex-col gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all rounded-none",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
                activeSection === section.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={activeSection === section.id ? "page" : undefined}
            >
              <ChevronRight
                className={cn(
                  "w-3 h-3 transition-transform",
                  activeSection === section.id ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
