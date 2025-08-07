'use client';

import { VoiceBot } from '@/components/voice-bot';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-gray-200">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900 mb-6">
          100x AI Agent Interview Bot
        </h1>
        <p className="text-center text-gray-600 mb-8 text-base sm:text-lg">
          Click the microphone to start speaking. The bot will respond to your questions.
        </p>
        <VoiceBot />
      </div>
    </div>
  );
}
