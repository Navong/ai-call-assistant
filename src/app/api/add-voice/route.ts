import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs"; // Adjust import as needed

// Initialize the ElevenLabs client using an environment variable for the API key.
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart/form-data body.
    const formData = await request.formData();
    const voiceFile = formData.get("voice");
    const name = formData.get("name");

    // Validate the form data.
    if (!(voiceFile instanceof Blob) || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    // Call the ElevenLabs API to add the voice.
    const response = await client.voices.add({
      name,
      files: [voiceFile],
    });

    console.log(response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error adding voice:", error);
    return NextResponse.json(
      { error: "Error adding voice", details: error.message || error.toString() },
      { status: 500 }
    );
  }
}
