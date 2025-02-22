// app/api/store-voice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/upstashClient";

export async function POST(request: NextRequest) {
  try {
    const { name, voice_id } = await request.json();
    if (!name || !voice_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Store the data in Redis using a hash.
    // Here we're using a key like `voice:{voice_id}` and storing the name and voice_id.
    await redis.hset(`voice:${voice_id}`, {
      name,
      voice_id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error storing voice info in Redis:", error);
    return NextResponse.json(
      { error: error.message || "Error storing data" },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
    try {
      // Retrieve all keys that match "voice:*"
      const keys = await redis.keys("voice:*");
      if (!keys || keys.length === 0) {
        return NextResponse.json({ error: "No voice record found" }, { status: 404 });
      }
      // For this example, we'll return the first voice record.
      const voiceKey = keys[0];
      const voiceData = await redis.hgetall(voiceKey);
  
      return NextResponse.json(voiceData);
    } catch (error: any) {
      console.error("Error fetching voice data from Redis:", error);
      return NextResponse.json(
        { error: error.message || "Error fetching voice data" },
        { status: 500 }
      );
    }
  }
