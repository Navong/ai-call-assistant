import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";
import { redis } from "@/lib/upstashClient";
import { generateText } from "ai"
import { createMistral } from "@ai-sdk/mistral"


const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });


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

const generatePrompt = async (request: NextRequest) => {
  try {
    // Get the name and task from the request body
    const { name, task, messageNumber = 0 } = await request.json()

    if (!name || !task) {
      return {
        prompt: "",
        first_message: "",


      }
    }

    if (!process.env.MISTRAL_API_KEY) {
      return {
        prompt: "",
        first_message: "",


      }
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

    return {
      message: text,
      prompt: systemPrompt,
      first_message: firstMessage,
      number: messageNumber + 1,
      messages: messages,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      prompt: "",
      first_message: "",
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body.
    const { voiceId, name } = await request.json();
    if (!voiceId) {
      return NextResponse.json({ error: "Missing voiceId" }, { status: 400 });
    }


    // const { prompt, first_message } = await generatePrompt(request)

    // Call the ElevenLabs API to create a conversational agent.
    const response = await client.conversationalAi.createAgent({
      conversation_config: {
        tts: {
          voice_id: voiceId,
        },
        agent: {
          prompt: {
            prompt: `
            You are not a customer service agent; you are a customer named "Sam." Your role is to act as a human customer would, replacing a real person. Speak naturally and casually, like a regular person, adding brief pauses or filler words (like "uh" or "um") where it feels right to mimic human speech.

- Begin the conversation by mentioning the restaurant name "HelloBabi."
- Your goal is to book a seat at the restaurant, so guide the conversation toward making that appointment.
- If something’s unclear or you’re unsure, say something like "Hold on a sec, let me think" to pause naturally, then continue.
- Don’t offer help or act like an assistant—stay in character as a customer focused on your own needs.
            

`,
          },
          first_message: `Hi I'm ${name}`,
        },
      },
    });

    const oldVal = await redis.hgetall(`voice:${voiceId}`);

    await redis.hset(`voice:${voiceId}`, {
      name: oldVal?.name || "defaultName",
      voiceId,
      agentId: response.agent_id,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error creating conversational agent:", error);
    return NextResponse.json(
      { error: "Error creating conversational agent", details: error.message || error.toString() },
      { status: 500 }
    );
  }
}
