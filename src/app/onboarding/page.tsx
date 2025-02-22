"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mic } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const Onboarding = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    job: "",
  });

  const sampleScript =
    "Hello! I'm excited to try out this new AI voice technology. This sample will help create a natural-sounding voice that matches my own.";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimer.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 10) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please ensure microphone permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Function to send the recorded voice to the backend
  const sendVoiceToBackend = async () => {
    if (!audioBlob) return null;
    const formDataPayload = new FormData();
    formDataPayload.append("voice", audioBlob, "recording.webm");
    formDataPayload.append("name", formData.name);

    try {
      const res = await fetch("/api/add-voice", {
        method: "POST",
        body: formDataPayload,
      });
      return await res.json();
    } catch (error) {
      console.error("Error adding voice:", error);
      toast.error("Error sending voice to backend.");
      return null;
    }
  };

  // Function to create the conversational agent
  const createAgent = async (voiceId: string, name: string) => {
    try {
      const res = await fetch("/api/create-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voiceId, name }),
      });
      return await res.json();
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Error creating conversational agent.");
      return null;
    }
  };

  // Final complete step: chain API calls and store data in Upstash Redis
  const handleComplete = async () => {
    if (!audioBlob) {
      toast.error("No recording available.");
      return;
    }

    try {
      // 1. Send the recorded audio to the backend
      const voiceResponse = await sendVoiceToBackend();
      console.log(voiceResponse);

      if (!voiceResponse || !voiceResponse.voice_id) {
        toast.error("Voice addition failed. No voice ID returned.");
        return;
      }

      const voiceId = voiceResponse.voice_id;

      // 2. Create a conversational agent using the voice ID
      const agentResponse = await createAgent(voiceId, formData.name);
      if (!agentResponse) {
        toast.error("Failed to create conversational agent.");
        return;
      }
      console.log("Agent created successfully:", agentResponse);

      // 3. Insert the name and voice ID into Upstash Redis via our API endpoint
      const storeResponse = await fetch("/api/store-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: formData.name, voice_id: voiceId }),
      });
      const storeData = await storeResponse.json();
      if (storeData.error) {
        toast.error("Error saving voice data in Redis.");
        return;
      }

      toast.success("Onboarding complete and voice saved in Redis!");
      // Redirect to dashboard after successful onboarding
      router.push("/dashboard");
    } catch (error) {
      console.error("Error during onboarding process:", error);
      toast.error("An error occurred during onboarding.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white"
    >
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl space-y-6">
        <div className="flex justify-between items-center">
          {step === 1 ? (
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="icon" onClick={prevStep}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Step {step} of 3
          </span>
          {step < 3 && (
            <Button variant="ghost" size="icon" onClick={nextStep}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <motion.div
          key={step}
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -10, opacity: 0 }}
          className="space-y-6"
        >
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Personal Information</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Job Details</h2>
              <div className="space-y-2">
                <Label htmlFor="job">Job Title</Label>
                <Input
                  id="job"
                  name="job"
                  value={formData.job}
                  onChange={handleInputChange}
                  placeholder="Enter your job title"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Voice Setup</h2>
              <p className="text-muted-foreground mb-4">
                Please read the following script to help us clone your voice:
              </p>
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-sm leading-relaxed">{sampleScript}</p>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-full relative"
                  variant={isRecording ? "destructive" : "default"}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
                {isRecording && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recording: {recordingTime}s</span>
                      <span>10s</span>
                    </div>
                    <Progress value={(recordingTime / 10) * 100} />
                  </div>
                )}
                {audioBlob && !isRecording && (
                  <div className="text-sm text-muted-foreground">
                    Recording saved! ({Math.round(audioBlob.size / 1024)} KB)
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={step === 3 ? handleComplete : nextStep}
            className="px-6"
            disabled={step === 3 && !audioBlob}
          >
            {step === 3 ? "Complete" : "Continue"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Onboarding;
