"use client"

import { useState } from "react"
import { ChevronRight, X } from "lucide-react"

interface TourStep {
  id: number
  title: string
  description: string
  target?: string
}

const tourSteps: TourStep[] = [
  {
    id: 1,
    title: "Dashboard Overview",
    description: "Your Overview dashboard shows key metrics, recent cases, and important notifications at a glance.",
  },
  {
    id: 2,
    title: "Cases Management",
    description: "Manage all your legal cases here. Track progress, add notes, and collaborate with clients.",
  },
  {
    id: 3,
    title: "HakiLens - Case Search",
    description: "HakiLens is your powerful case search tool. Find relevant legal precedents and case law quickly.",
  },
  {
    id: 4,
    title: "HakiDraft - AI Assistant",
    description:
      "HakiDraft is your AI legal assistant. Get help with legal research, document drafting, and case analysis.",
  },
  {
    id: 5,
    title: "HakiReview - Document Analysis",
    description: "HakiReview uses AI to analyze and review legal documents, helping you catch important details.",
  },
  {
    id: 6,
    title: "HakiReminders - Stay Organized",
    description:
      "Never miss important deadlines! HakiReminders helps you manage court dates, client meetings, and deadlines.",
  },
  {
    id: 7,
    title: "Document Management",
    description: "Store, organize, and manage all your legal documents securely in one place.",
  },
  {
    id: 8,
    title: "Settings",
    description: "Customize your profile, notification preferences, and account settings here.",
  },
  {
    id: 9,
    title: "Browse Bounties",
    description: "Apply for bounties from NGOs and earn rewards upon completion of milestones.",
  },
  {
    id: 10,
    title: "You're All Set!",
    description: "You're now ready to start using HakiChain. Good luck with your cases!",
  },
]

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = tourSteps[currentStep]
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
          </div>
          <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 transition p-1" title="Skip tour">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <span className="text-xs font-medium text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
            {currentStep < tourSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleSkip}
          className="w-full mt-3 text-gray-600 hover:text-gray-700 font-medium text-sm transition"
        >
          Skip Tour
        </button>
      </div>
    </div>
  )
}
