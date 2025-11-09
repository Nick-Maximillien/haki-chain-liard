import { useEffect } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

interface TourGuideProps {
  onComplete: () => void
}

export default function TourGuide({ onComplete }: TourGuideProps) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: '[data-tour="overview"]',
          popover: {
            title: "Overview Dashboard",
            description: "This is your performance overview — active cases, earnings, ratings, and reminders.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="cases"]',
          popover: {
            title: "Cases",
            description: "View all cases you're working on or applied for with detailed progress tracking.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="haki-lens"]',
          popover: {
            title: "HakiLens",
            description:
              "Search case law with AI-powered deep research. Auto-detect, crawl listings, or research single cases.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="haki-draft"]',
          popover: {
            title: "HakiDraft",
            description: "Generate professional legal documents with AI assistance across multiple practice areas.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="haki-review"]',
          popover: {
            title: "HakiReview",
            description: "Upload and analyze legal documents with AI-powered review and chat assistance.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="haki-reminders"]',
          popover: {
            title: "HakiReminders",
            description: "Never miss a deadline with AI-powered reminders and Kanban workflow management.",
            side: "right",
            align: "start",
          },
        },
        {
          element: '[data-tour="documents"]',
          popover: {
            title: "Documents",
            description: "Central repository for all your case documents, searchable and organized.",
            side: "right",
            align: "start",
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy()
        onComplete()
      },
    })

    driverObj.drive()

    return () => {
      driverObj.destroy()
    }
  }, [onComplete])

  return null
}
