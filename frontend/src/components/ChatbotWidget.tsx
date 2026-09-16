import { useEffect, useRef, useState, type FormEvent } from 'react'

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
}

const suggestionChips = [
  'How do I enroll?',
  'What are the requirements?',
  'What programs are available?',
  'Where is the location?',
]

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Hello! I can help answer questions about MCCTEST programs, enrollment, and certification.',
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const askQuestion = async (question: string) => {
    const trimmedQuery = question.trim()
    if (!trimmedQuery || isLoading) {
      return
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmedQuery,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setQuery('')
    setIsLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL

      if (!apiUrl) {
        throw new Error('The chatbot service is not configured.')
      }

      const response = await fetch(`${apiUrl}/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),
      })
      const data = (await response.json()) as {
        reply?: string
        message?: string | string[]
      }

      if (!response.ok) {
        const errorMessage = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        throw new Error(errorMessage || 'The chatbot could not process your question.')
      }

      if (!data.reply) {
        throw new Error('The chatbot returned an empty response.')
      }

      const reply = data.reply
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: reply,
        },
      ])
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'Unable to reach the chatbot. Please try again later.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await askQuestion(query)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          aria-label="MCCTEST chatbot"
          className="flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-blue-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">
                MCCTEST Assistant
              </p>
              <p className="mt-1 text-sm text-blue-100">Ask about our programs</p>
            </div>
            <button
              type="button"
              aria-label="Close chatbot"
              onClick={() => setIsOpen(false)}
              className="rounded p-2 text-xl leading-none text-blue-100 transition hover:bg-blue-900 hover:text-white"
            >
              &times;
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <p
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-blue-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}

            {isLoading && (
              <p className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Thinking...
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white px-3 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Frequently asked
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestionChips.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setQuery('')
                    void askQuestion(suggestion)
                  }}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-left text-xs font-medium text-blue-900 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
            <label htmlFor="chatbot-query" className="sr-only">
              Ask the MCCTEST Assistant
            </label>
            <div className="flex gap-2">
              <input
                id="chatbot-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type your question..."
                maxLength={500}
                disabled={isLoading}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-800 focus:ring-1 focus:ring-blue-800 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close MCCTEST Assistant' : 'Open MCCTEST Assistant'}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-900 text-white shadow-xl transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
      >
        <span aria-hidden="true" className="text-xl">
          💬
        </span>
      </button>
    </div>
  )
}

export default ChatbotWidget