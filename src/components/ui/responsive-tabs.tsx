import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  content: React.ReactNode
}

interface ResponsiveTabsProps {
  tabs: TabItem[]
  defaultValue: string
  visibleTabsCount?: number // Number of tabs to show before dropdown on mobile
  className?: string
}

export function ResponsiveTabs({
  tabs,
  defaultValue,
  visibleTabsCount = 4,
  className,
}: ResponsiveTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  const visibleTabs = tabs.slice(0, visibleTabsCount)
  const dropdownTabs = tabs.slice(visibleTabsCount)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full", className)}>
      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
        <TabsList className="flex-1 justify-start overflow-x-auto bg-transparent">
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3 py-1.5 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {dropdownTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-9 px-3 bg-background border-border/50 hover:bg-accent/50 transition-all"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More tabs</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover z-50 shadow-lg border-border/50">
              {dropdownTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer transition-colors",
                    activeTab === tab.value && "bg-accent text-accent-foreground"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4 sm:mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
