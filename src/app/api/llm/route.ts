import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createMistral } from "@ai-sdk/mistral"

// Custom fetch implementation with error handling and logging
const customFetch = async (input: string | Request | URL, init?: RequestInit): Promise<Response> => {
  const startTime = Date.now()
  try {
    const response = await fetch(input, init)
    const endTime = Date.now()
    console.log(`API Request to ${input} completed in ${endTime - startTime}ms`)
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }
    
    return response
  } catch (error) {
    console.error("API Request failed:", error)
    throw error
  }
}

// Create a custom Mistral instance with all available configurations
const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_API_URL || "https://api.mistral.ai/v1",
  headers: {
    "x-custom-header": "custom-value",
    "x-request-source": "next-app",
  },
  fetch: customFetch,
})

// Create a model instance with safety settings
const model = mistral("mistral-large-latest", {
  safePrompt: true,
})

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
  timestamp: string // Add timestamp for message tracking
}

// Helper function to create the system prompt
const createSystemPrompt = (name: string, task: string) => {
  return `You are an AI assistant focused on completing this specific task: "${task}".
Your primary goal is to efficiently help ${name} accomplish this task.
Be professional, direct, and solution-oriented.
Always maintain focus on completing the given task.`
}

// Helper function to create the first message
const createFirstMessage = (name: string, task: string) => {
  return `Hi ${name}!`
}

export async function POST(request: Request) {
  try {
    // Get the name and task from the request body
    const { name, task, messageNumber = 0 } = await request.json()

    if (!name || !task) {
      return NextResponse.json(
        { error: "Name and task are required" },
        { status: 400 }
      )
    }

    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json(
        { error: "Mistral API key is not configured" },
        { status: 500 }
      )
    }

    const systemPrompt = createSystemPrompt(name, task)
    const firstMessage = createFirstMessage(name, task)

    // Create the conversation history with timestamps
    const messages: ChatMessage[] = [
      { 
        role: "system", 
        content: systemPrompt,
        timestamp: new Date().toISOString()
      },
      { 
        role: "user", 
        content: firstMessage,
        timestamp: new Date().toISOString()
      }
    ]

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: firstMessage,
    })

    // Store the assistant's response with timestamp
    messages.push({ 
      role: "assistant", 
      content: text,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: text,
      prompt: systemPrompt,
      first_message: firstMessage,
      number: messageNumber + 1,
      messages: messages,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in chat:", error)
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

