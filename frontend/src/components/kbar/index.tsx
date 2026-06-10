import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { navGroups } from "@/config/nav-config"

interface KBarProps {
  children: ReactNode
}

export default function KBar({ children }: KBarProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const run = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem key={item.url} onSelect={() => run(item.url)}>
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          {!user && (
            <CommandGroup heading="Account">
              <CommandItem onSelect={() => run("/sign-in")}>Sign in</CommandItem>
              <CommandItem onSelect={() => run("/sign-up")}>Sign up</CommandItem>
            </CommandGroup>
          )}
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run("/upload")}>Upload CAS</CommandItem>
            <CommandItem onSelect={() => run("/clients")}>Clients</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
