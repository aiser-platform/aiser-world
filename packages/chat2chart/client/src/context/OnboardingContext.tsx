'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: ReactNode;
  completed: boolean;
}

interface OnboardingContextType {
  isOnboardingActive: boolean;
  currentStep: number;
  totalSteps: number;
  onboardingData: any;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  updateOnboardingData: (data: any) => void;
  markStepCompleted: (stepId: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const totalSteps = 4; // Welcome Form, Data Sources, Chat Demo, Complete

  // Check if user needs onboarding
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check both localStorage and backend API
      const checkOnboardingStatus = async () => {
        try {
          // First check localStorage for quick check
          const hasCompletedOnboardingLocal = localStorage.getItem(`onboarding_completed_${user.email}`);
          
          // Also check backend API for accurate status
          const response = await fetch('/api/onboarding/status', {
            credentials: 'include',
          });
          
          let needsOnboarding = true;
          if (response.ok) {
            const status = await response.json();
            needsOnboarding = !status.completed;
            
            // Sync localStorage with backend
            if (status.completed) {
              localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
            } else {
              localStorage.removeItem(`onboarding_completed_${user.email}`);
            }
          } else {
            // Fallback to localStorage if API fails
            needsOnboarding = !hasCompletedOnboardingLocal;
          }
          
          if (needsOnboarding) {
            // Check if this is their first visit to the platform
            const firstVisit = localStorage.getItem(`first_visit_${user.email}`);
            if (!firstVisit) {
              localStorage.setItem(`first_visit_${user.email}`, 'true');
              // Start onboarding after a short delay to let the page load
              setTimeout(() => {
                setIsOnboardingActive(true);
              }, 1000);
            }
          }
        } catch (error) {
          console.error('Failed to check onboarding status:', error);
          // Fallback: check localStorage only
          const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.email}`);
          if (!hasCompletedOnboarding) {
            const firstVisit = localStorage.getItem(`first_visit_${user.email}`);
            if (!firstVisit) {
              localStorage.setItem(`first_visit_${user.email}`, 'true');
              setTimeout(() => {
                setIsOnboardingActive(true);
              }, 1000);
            }
          }
        }
      };
      
      checkOnboardingStatus();
    }
  }, [isAuthenticated, user]);

  const startOnboarding = () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
  };

  const completeOnboarding = async () => {
    try {
      // Send completion to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id || user?.email,
          onboardingData: onboardingData,
          completedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (user) {
            localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
          }
          setIsOnboardingActive(false);
          setCurrentStep(0);
          setOnboardingData({});
          setCompletedSteps([]);
          // Reload page to refresh organization/project context
          window.location.reload();
        } else {
          throw new Error('Onboarding completion failed');
        }
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to complete onboarding' }));
        throw new Error(error.detail || 'Failed to complete onboarding');
      }
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error);
      // Still mark as completed locally to prevent infinite loop
      if (user) {
        localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
      }
      setIsOnboardingActive(false);
      setCurrentStep(0);
      setOnboardingData({});
      setCompletedSteps([]);
      alert(`Failed to complete onboarding: ${error?.message || 'Unknown error'}. Please refresh the page.`);
    }
  };

  const skipOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
    }
    setIsOnboardingActive(false);
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateOnboardingData = (data: any) => {
    setOnboardingData((prev: any) => ({ ...prev, ...data }));
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => [...prev, stepId]);
  };

  const value: OnboardingContextType = {
    isOnboardingActive,
    currentStep,
    totalSteps,
    onboardingData,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    nextStep,
    prevStep,
    updateOnboardingData,
    markStepCompleted,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
