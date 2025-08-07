'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mic, StopCircle, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export function VoiceBot() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setAiResponse('');
        setError(null);
        console.log('Speech recognition started');
      };

      recognitionRef.current.onresult = (event: any) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        console.log('Transcript:', currentTranscript);
        recognitionRef.current.stop(); // Stop listening after a result
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}. Please try again.`);
        setIsListening(false);
        setIsLoading(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
        if (transcript) {
          handleSendToAI(transcript);
        } else if (!error) {
          setError('No speech detected. Please try again.');
        }
      };
    } else {
      setError('Speech Recognition API is not supported in this browser.');
    }

    // Cleanup for speech synthesis
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [transcript, error]); // Re-run effect if transcript or error changes to ensure onend logic is correct

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setAiResponse('');
      setError(null);
      setIsLoading(false);
      setIsSpeaking(false);
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        console.error('Error starting speech recognition:', e);
        setError(`Error starting microphone: ${e.message}. Please ensure microphone access is granted.`);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSendToAI = async (message: string) => {
    if (!message.trim()) {
      setError('Please say something to get a response.');
      return;
    }
    setIsLoading(true);
    setAiResponse('');
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      setAiResponse(data.response);
      if (!isMuted) {
        speakResponse(data.response);
      }
    } catch (err: any) {
      console.error('Error fetching AI response:', err);
      setError(`Error: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0; // You can adjust speed
      utterance.pitch = 1.0; // You can adjust pitch

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setError('Failed to speak response. Your browser might not support the selected voice or language.');
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else if (isMuted) {
      console.log('Speech synthesis is muted.');
    } else {
      setError('Text-to-Speech API is not supported in this browser.');
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newState = !prev;
      if (newState) {
        window.speechSynthesis.cancel(); // Stop speaking if muting
        setIsSpeaking(false);
      } else if (aiResponse && !isSpeaking) {
        // If unmuting and there's a response, speak it
        speakResponse(aiResponse);
      }
      return newState;
    });
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          onClick={isListening ? stopListening : startListening}
          className={cn(
            'relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg',
            isListening
              ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-300 animate-pulse'
              : 'bg-gray-800 hover:bg-gray-900'
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          ) : isListening ? (
            <StopCircle className="h-10 w-10 text-white" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
          {isListening && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 h-4 w-4 rounded-full bg-red-400 animate-ping" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="w-12 h-12 rounded-full"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="h-6 w-6 text-gray-600" /> : <Volume2 className="h-6 w-6 text-gray-600" />}
        </Button>
      </div>

      {error && (
        <Card className="w-full border-red-400 bg-red-50">
          <CardContent className="p-4 text-red-700 text-sm">
            {error}
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Your Speech</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={transcript}
            readOnly
            placeholder="Speak into the microphone..."
            className="min-h-[80px] bg-gray-50 border-gray-200 text-gray-700"
          />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Bot's Response</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={aiResponse}
            readOnly
            placeholder={isLoading ? 'Thinking...' : 'Bot response will appear here...'}
            className="min-h-[120px] bg-gray-50 border-gray-200 text-gray-700"
          />
        </CardContent>
      </Card>
    </div>
  );
}
