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
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.email}`);
      const isNewUser = !hasCompletedOnboarding;
      
      if (isNewUser) {
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
    }
  }, [isAuthenticated, user]);

  const startOnboarding = () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
  };

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
    }
    setIsOnboardingActive(false);
    setCurrentStep(0);
    setOnboardingData({});
    setCompletedSteps([]);
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
