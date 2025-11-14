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
      <div className="flex items-center gap-2">
        <TabsList className="flex-1 justify-start overflow-x-auto">
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3 text-xs md:text-sm"
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
                className="shrink-0 h-10 px-3 bg-background"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More tabs</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background z-50">
              {dropdownTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    activeTab === tab.value && "bg-accent"
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
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
