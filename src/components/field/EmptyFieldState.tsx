
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, MapPin, Coffee } from "lucide-react"

interface EmptyFieldStateProps {
  type: 'agents' | 'stations' | 'collections'
  onAdd?: () => void
}

const EmptyFieldState = ({ type, onAdd }: EmptyFieldStateProps) => {
  const config = {
    agents: {
      icon: Users,
      title: "No Field Agents",
      description: "Start by adding field agents to manage rural operations",
      buttonText: "Add First Agent"
    },
    stations: {
      icon: MapPin,
      title: "No Buying Stations",
      description: "Create buying stations to collect coffee from farmers",
      buttonText: "Add First Station"
    },
    collections: {
      icon: Coffee,
      title: "No Collections Yet",
      description: "Collections will appear here once agents start working",
      buttonText: "Record Collection"
    }
  }

  const { icon: Icon, title, description, buttonText } = config[type]

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4">{description}</p>
        {onAdd && (
          <Button onClick={onAdd} className="mx-auto">
            <Plus className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default EmptyFieldState
