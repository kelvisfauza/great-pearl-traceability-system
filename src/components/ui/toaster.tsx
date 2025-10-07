import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, onClick, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            onClick={onClick}
            className="fixed top-4 right-4 z-50 w-80 rounded-lg bg-card border shadow-lg animate-in slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=closed]:fade-out-0 duration-300"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex-1 grid gap-1">
                {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-sm text-muted-foreground">{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose className="h-4 w-4 opacity-70 hover:opacity-100" />
            </div>
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-0 right-0 flex flex-col-reverse p-4 sm:top-0 sm:right-0 sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  )
}
