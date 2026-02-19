import { useEffect, useState } from "react"

export function useScrollSpy(sectionIds: string[], offset: number = 100) {
  const [activeSection, setActiveSection] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio (highest first)
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          const topEntry = visibleEntries[0]
          
          if (topEntry.isIntersecting) {
            setActiveSection(topEntry.target.id)
          }
        }
      },
      {
        rootMargin: `-${offset}px 0% -60% 0%`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    // Observe all sections
    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [sectionIds, offset])

  return activeSection
}
