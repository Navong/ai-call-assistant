import { useEffect } from "react";
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

export function useConversationPolling(
  agentId: string,
  isActive: boolean,
  onConversationEnd: () => void
) {
  useEffect(() => {
    if (!isActive) return;

    let initialLength: number | null = null;
    const interval = setInterval(async () => {
      try {
        const conversations = await client.conversationalAi.getConversations({
          agent_id: agentId,
        });
        if (initialLength === null) {
          initialLength = conversations.length;
        } else if (conversations.length !== initialLength) {
          console.log("conversation ended");
          onConversationEnd();
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [agentId, isActive, onConversationEnd]);
}
