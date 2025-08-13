import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, X, CheckCircle, Users, BarChart3, DollarSign, Package, FileText, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  feature: string;
  tips: string[];
}

const tourSteps: TourStep[] = [
  {
    id: 1,
    title: "Welcome to Coffee Management Training!",
    content: "You're now using a training account with sample data. This guided tour will show you all the key features of our coffee management system.",
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
    feature: "Getting Started",
    tips: [
      "All data here is for training purposes only",
      "You can safely experiment with all features",
      "Your progress is tracked as you learn"
    ]
  },
  {
    id: 2,
    title: "Dashboard Overview",
    content: "The main dashboard shows real-time metrics, recent activities, and quick actions. This is your command center for daily operations.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    feature: "Dashboard Navigation",
    tips: [
      "Check key metrics at a glance",
      "View recent transactions and activities",
      "Access quick actions for common tasks"
    ]
  },
  {
    id: 3,
    title: "Employee Management",
    content: "Manage your workforce, track attendance, process salary payments, and handle employee records efficiently.",
    icon: <Users className="h-8 w-8 text-primary" />,
    feature: "Human Resources",
    tips: [
      "Add new employees with detailed profiles",
      "Process monthly salary payments",
      "Track employee performance and attendance"
    ]
  },
  {
    id: 4,
    title: "Financial Operations",
    content: "Handle all financial transactions, expenses, payments to suppliers, and generate financial reports.",
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    feature: "Finance Management",
    tips: [
      "Record daily expenses and income",
      "Process supplier payments",
      "Generate financial reports and summaries"
    ]
  },
  {
    id: 5,
    title: "Inventory & Store Management",
    content: "Track coffee inventory, manage stock levels, monitor quality assessments, and handle storage locations.",
    icon: <Package className="h-8 w-8 text-primary" />,
    feature: "Inventory Control",
    tips: [
      "Monitor coffee stock levels in real-time",
      "Track quality assessments and grades",
      "Manage multiple storage locations"
    ]
  },
  {
    id: 6,
    title: "Reports & Analytics",
    content: "Generate comprehensive reports, analyze performance metrics, and gain insights into your operations.",
    icon: <FileText className="h-8 w-8 text-primary" />,
    feature: "Business Intelligence",
    tips: [
      "Create custom reports for different periods",
      "Analyze sales and procurement trends",
      "Export data for external analysis"
    ]
  },
  {
    id: 7,
    title: "System Settings",
    content: "Configure system preferences, manage user accounts, and customize the platform to fit your needs.",
    icon: <Settings className="h-8 w-8 text-primary" />,
    feature: "Configuration",
    tips: [
      "Set up new user accounts",
      "Configure system preferences",
      "Manage access permissions"
    ]
  }
];

export default function TrainingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is a training account and hasn't completed the tour
    const checkTrainingStatus = async () => {
      if (!user) return;

      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('is_training_account, training_progress')
          .eq('email', user.email)
          .maybeSingle();

        // Show tour for training accounts that haven't completed it
        if (employee?.is_training_account && (employee.training_progress || 0) < tourSteps.length) {
          setIsOpen(true);
          setCurrentStep(employee.training_progress || 0);
        }
      } catch (error) {
        console.error('Error checking training status:', error);
      }
    };

    checkTrainingStatus();
  }, [user]);

  const updateProgress = async (stepIndex: number) => {
    if (!user) return;

    try {
      await supabase
        .from('employees')
        .update({ training_progress: stepIndex + 1 })
        .eq('email', user.email);
    } catch (error) {
      console.error('Error updating training progress:', error);
    }
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    setCompletedSteps([...completedSteps, currentStep]);
    
    if (nextStep < tourSteps.length) {
      setCurrentStep(nextStep);
      await updateProgress(nextStep);
    } else {
      // Tour completed
      await updateProgress(tourSteps.length);
      setIsOpen(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await updateProgress(tourSteps.length);
    setIsOpen(false);
  };

  const currentTourStep = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  if (!isOpen || !currentTourStep) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentTourStep.icon}
              <div>
                <DialogTitle className="text-xl">{currentTourStep.title}</DialogTitle>
                <Badge variant="secondary" className="mt-1">
                  Step {currentStep + 1} of {tourSteps.length}
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-primary mb-2">{currentTourStep.feature}</h3>
              <p className="text-muted-foreground">{currentTourStep.content}</p>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <h4 className="font-medium">Key Features:</h4>
              <ul className="space-y-1">
                {currentTourStep.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
              <Button onClick={handleNext} className="flex items-center gap-2">
                {currentStep === tourSteps.length - 1 ? 'Complete' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}