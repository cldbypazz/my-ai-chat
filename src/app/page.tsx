'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col w-full h-screen max-w-md mx-auto bg-gray-50">
      {/* Header */}
      <header className="p-4 bg-white border-b shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center text-gray-800">My AI Assistant</h1>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>👋 Hello! I'm your AI. Ask me anything!</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              <span className="block text-sm font-bold mb-1 opacity-70">
                {m.role === 'user' ? 'You' : 'AI'}
              </span>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            value={input}
            placeholder="Type a message..."
            onChange={handleInputChange}
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
