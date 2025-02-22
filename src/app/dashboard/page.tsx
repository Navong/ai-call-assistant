"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Script from "next/script";
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({
    apiKey: "sk_cb0e99799d8e277f41c5ea11a2013436b842563fed2b0585",
});

interface Task {
    id: string;
    title: string;
    description: string;
    phoneNumber: string;
    created: Date;
}

interface VoiceData {
    name: string;
    agentId: string;
}

export default function Dashboard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [voiceData, setVoiceData] = useState<VoiceData | null>(null);

    // Fetch the latest voice data from Upstash Redis on component mount.
    useEffect(() => {
        const fetchVoiceData = async () => {
            try {
                const res = await fetch("/api/store-voice");
                if (!res.ok) {
                    throw new Error("Failed to fetch voice data");
                }
                const data = await res.json();

                console.log("Voice data:", data);
                setVoiceData(data);
            } catch (error) {
                console.error("Error fetching voice data:", error);
            }
        };

        fetchVoiceData();
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newTask: Task = {
            id: crypto.randomUUID(),
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            phoneNumber: formData.get("phoneNumber") as string,
            created: new Date(),
        };

        setTasks([...tasks, newTask]);
        setIsFormOpen(false);
        toast.success("Task added successfully. The AI agent will process this task soon.");

        (e.target as HTMLFormElement).reset();
    };

    // Poll conversations only when the call is active.
    useEffect(() => {
        if (!isCallActive) return;

        let initialLength: number | null = null;

        const pollConversations = async () => {
            try {
                const client = new ElevenLabsClient({
                    apiKey: "sk_cb0e99799d8e277f41c5ea11a2013436b842563fed2b0585",
                });
                const response = await client.conversationalAi.getConversations({
                    agent_id: voiceData?.agentId || "default-agent-id",
                });
                const currentLength = response.conversations?.length;

                console.log("Initial length:", initialLength, "Current length:", currentLength);

                if (initialLength === null && currentLength !== undefined) {
                    initialLength = currentLength;
                } else if (currentLength !== undefined && currentLength !== initialLength) {
                    console.log("conversation ended");
                    clearInterval(interval);
                    setIsCallActive(false);
                }
            } catch (error) {
                console.error("Error fetching conversations:", error);
            }
        };

        const interval = setInterval(pollConversations, 2000);

        return () => clearInterval(interval);
    }, [isCallActive, voiceData]);

    const handleCallClick = (task: Task) => {
        setActiveTask(task);
        setIsCallActive(true);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="container mx-auto py-8 px-4"
            >
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">AI Call Agent Dashboard</h1>
                    <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Task
                    </Button>
                </div>

                {isFormOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8"
                    >
                        <div className="glass-panel rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Task Title</Label>
                                    <Input id="title" name="title" placeholder="Enter task title" required />
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Input id="description" name="description" placeholder="Enter task description" required />
                                </div>
                                <div>
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit">Create Task</Button>
                                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}

                <div className="glass-panel rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <List className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Tasks</h2>
                    </div>
                    {tasks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No tasks added yet. Click the "Add Task" button to create your first task.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                >
                                    <h3 className="font-medium">{task.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-sm text-muted-foreground">📞 {task.phoneNumber}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {task.created.toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <Button onClick={() => handleCallClick(task)}>
                                            Speak with AI Agent
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {isCallActive && voiceData && (
                <div className="container mx-auto px-4 pb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Speak with AI Agent ({voiceData.name})</h2>
                        <Button variant="destructive" onClick={() => setIsCallActive(false)}>
                            End Call
                        </Button>
                    </div>
                    {/* ElevenLabs Convai widget using the fetched agent_id */}
                    <elevenlabs-convai agent-id={voiceData.agentId}></elevenlabs-convai>
                    <Script
                        src="https://elevenlabs.io/convai-widget/index.js"
                        strategy="afterInteractive"
                        async
                        type="text/javascript"
                    />
                </div>
            )}
        </>
    );
}
