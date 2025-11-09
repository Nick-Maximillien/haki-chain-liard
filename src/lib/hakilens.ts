const HAKILENS_API = import.meta.env.VITE_HAKILENS_API_URL || "https://hakilens-v77g.onrender.com"

export interface CaseData {
  case_id: string
  title: string
  court?: string
  case_number?: string
  parties?: string
  judges?: string
  date_created?: string
  summary?: string
  content?: string
}

export interface CaseDocument {
  filename: string
  url: string
}

export interface CaseImage {
  filename: string
  url: string
}

export interface ScrapeResult {
  success: boolean
  data?: any
  error?: string
}

export const hakilensApi = {
  async scrapeUrl(url: string, deep: boolean = true): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${HAKILENS_API}/scrape/url?url=${encodeURIComponent(url)}&deep=${deep}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error scraping URL:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async scrapeListing(url: string, maxPages?: number, deep: boolean = true): Promise<ScrapeResult> {
    try {
      const params = new URLSearchParams({ url, deep: String(deep) })
      if (maxPages) params.append("max_pages", String(maxPages))

      const response = await fetch(`${HAKILENS_API}/scrape/listing?${params.toString()}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error scraping listing:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async scrapeCase(url: string, deep: boolean = true): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${HAKILENS_API}/scrape/case?url=${encodeURIComponent(url)}&deep=${deep}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error scraping case:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async searchCases(query: string, deep: boolean = true): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${HAKILENS_API}/scrape/search?q=${encodeURIComponent(query)}&deep=${deep}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error searching cases:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async listCases(searchTerm?: string, limit: number = 20, offset: number = 0): Promise<CaseData[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (searchTerm) params.append("search", searchTerm)

      const response = await fetch(`${HAKILENS_API}/cases?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
        return data.items.map((item: any) => ({
          case_id: String(item.id || item.case_id || ''),
          title: item.title || 'Untitled Case',
          court: item.court || undefined,
          case_number: item.case_number || undefined,
          parties: item.parties || undefined,
          judges: item.judges || undefined,
          date_created: item.date || item.date_created || undefined,
          summary: item.summary || undefined,
          content: item.content || undefined,
        }))
      }

      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          case_id: String(item.id || item.case_id || ''),
          title: item.title || 'Untitled Case',
          court: item.court || undefined,
          case_number: item.case_number || undefined,
          parties: item.parties || undefined,
          judges: item.judges || undefined,
          date_created: item.date || item.date_created || undefined,
          summary: item.summary || undefined,
          content: item.content || undefined,
        }))
      }

      return []
    } catch (error) {
      console.error("Error listing cases:", error)
      return []
    }
  },

  async getCase(caseId: string): Promise<CaseData | null> {
    try {
      const response = await fetch(`${HAKILENS_API}/cases/${caseId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting case:", error)
      return null
    }
  },

  async getCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    try {
      const response = await fetch(`${HAKILENS_API}/cases/${caseId}/documents`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting case documents:", error)
      return []
    }
  },

  async getCaseImages(caseId: string): Promise<CaseImage[]> {
    try {
      const response = await fetch(`${HAKILENS_API}/cases/${caseId}/images`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting case images:", error)
      return []
    }
  },

  async summarizeCase(caseId: string): Promise<string | null> {
    try {
      const response = await fetch(`${HAKILENS_API}/ai/summarize/${caseId}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.summary || null
    } catch (error) {
      console.error("Error summarizing case:", error)
      return null
    }
  },

  async askAI(question: string): Promise<string | null> {
    try {
      const response = await fetch(`${HAKILENS_API}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.answer || null
    } catch (error) {
      console.error("Error asking AI:", error)
      return null
    }
  },

  async chatWithCase(caseId: string, message: string): Promise<string | null> {
    try {
      const response = await fetch(`${HAKILENS_API}/ai/chat/${caseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.response || null
    } catch (error) {
      console.error("Error chatting with case:", error)
      return null
    }
  },
}
