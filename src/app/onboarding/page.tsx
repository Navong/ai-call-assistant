"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    job: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white"
    >
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={prevStep}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Step {step} of 3</span>
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
              <p className="text-muted-foreground">
                Record a short sample to clone your voice or choose from our preset voices.
              </p>
              <Button 
                onClick={() => {}} 
                className="w-full"
                variant="outline"
              >
                Start Recording
              </Button>
            </div>
          )}
        </motion.div>

        <div className="flex justify-end pt-4">
          {step < 3 ? (
            <Button onClick={nextStep} className="px-6">
              Continue
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button className="px-6">Complete</Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
