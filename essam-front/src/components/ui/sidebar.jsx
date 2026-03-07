import * as React from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const SidebarContext = React.createContext(undefined)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

const SidebarProvider = React.forwardRef(
  ({ children, defaultOpen = true, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)

    return (
      <SidebarContext.Provider value={{ open, setOpen }}>
        <div ref={ref} className="flex h-screen w-full overflow-hidden" {...props}>
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef(({ className, ...props }, ref) => {
  const { open } = useSidebar()
  return (
    <aside
      ref={ref}
      className={cn(
        "flex h-full w-64 flex-col border-l bg-background transition-all duration-300 shrink-0",
        !open && "w-0 overflow-hidden border-0",
        className
      )}
      {...props}
    />
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-2", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-1 flex-col gap-2 overflow-auto px-2 py-4", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex w-full min-w-0 flex-col", className)}
    {...props}
  />
))
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef(
  ({ className, asChild = false, isActive, size = "default", ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button"
    return (
      <Comp
        ref={ref}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
          size === "sm" && "h-7 text-xs",
          size === "lg" && "h-12 text-base",
          isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
          className
        )}
        data-active={isActive}
        {...props}
      />
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuSub = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-0.5 border-r border-sidebar-border", className)}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef(
  ({ className, asChild = false, isActive, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "a"
    return (
      <Comp
        ref={ref}
        className={cn(
          "flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground/50",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          className
        )}
        data-active={isActive}
        {...props}
      />
    )
  }
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarInput = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent px-2 text-sm text-sidebar-foreground outline-none ring-sidebar-ring file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
SidebarInput.displayName = "SidebarInput"

const SidebarRail = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("absolute inset-y-0 left-0 z-50 hidden w-1 group-hover/sidebar:block", className)}
    {...props}
  />
))
SidebarRail.displayName = "SidebarRail"

const SidebarTrigger = React.forwardRef(({ className, ...props }, ref) => {
  const { open, setOpen } = useSidebar()
  return (
    <button
      ref={ref}
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden min-w-0",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

export { 
  SidebarProvider, 
  Sidebar, 
  SidebarTrigger, 
  SidebarInset, 
  useSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInput,
  SidebarRail,
}

