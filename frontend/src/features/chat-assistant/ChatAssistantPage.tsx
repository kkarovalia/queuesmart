import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Bot, Clock3, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useChatHistory, useSendChatMessage } from '../../api'
import Markdown from 'react-markdown'
import './chat-assistant.css'

const MAX_MESSAGE_LENGTH = 500

const QUICK_PROMPTS = [
    'What queues are open?',
    'Where am I in line?',
    'Do I have any notifications?',
]

export function ChatAssistantPage() {
    const history = useChatHistory()
    const sendMessage = useSendChatMessage()
    const messages = history.data ?? []
    const [input, setInput] = useState('')
    const endOfConversationRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endOfConversationRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
    }, [messages.length, sendMessage.isPending])

    function submitMessage(content: string) {
        const trimmed = content.trim()
        if (!trimmed || sendMessage.isPending || history.isLoading) return

        setInput('')
        sendMessage.mutate(trimmed, {
            onError: () => setInput(trimmed),
        })
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        submitMessage(input)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submitMessage(input)
        }
    }

    return (
        <section className="chat-page page">
            <header className="page-header chat-page__header">
                <div>
                    <span className="chat-page__eyebrow"><Sparkles size={14} aria-hidden="true" /> Smart queue help</span>
                    <h1>Queue Assistant</h1>
                    <p>Check waitlists, ask about your status, or manage your place in line.</p>
                </div>
                <span className="chat-page__status"><span aria-hidden="true" /> Ready to help</span>
            </header>

            <div className="chat-layout">
                <section className="chat-panel panel" aria-label="Queue Assistant conversation">
                    <div className="chat-panel__topbar">
                        <span className="chat-panel__avatar"><Bot size={22} aria-hidden="true" /></span>
                        <div><strong>QueueSmart Assistant</strong><span>Restaurant queue support</span></div>
                    </div>

                    <div className="chat-messages" aria-live="polite" aria-busy={history.isLoading || sendMessage.isPending}>
                        {history.isLoading ? (
                            <div className="chat-loading"><span /><span /><span /><p>Loading your conversation…</p></div>
                        ) : null}

                        {!history.isLoading && messages.length === 0 ? (
                            <div className="chat-welcome">
                                <span><Sparkles size={25} aria-hidden="true" /></span>
                                <h2>Your queue, one message away</h2>
                                <p>I can show open waitlists, check your position and notifications, or help you join and leave a queue.</p>
                                <small>Start with a common question</small>
                                <div className="chat-quick-prompts">
                                    {QUICK_PROMPTS.map(prompt => (
                                        <button key={prompt} type="button" onClick={() => submitMessage(prompt)} disabled={sendMessage.isPending}>
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {messages.map((message, index) => (
                            <article className={`chat-message chat-message--${message.role}`} key={`${message.role}-${index}-${message.content.slice(0, 20)}`}>
                                <span className="chat-message__avatar">
                                    {message.role === 'assistant' ? <Bot size={17} aria-hidden="true" /> : <UserRound size={17} aria-hidden="true" />}
                                </span>
                                <div><span className="chat-message__author">{message.role === 'assistant' ? 'Queue Assistant' : 'You'}</span>
                                    <div className="chat-message__body">
                                        <Markdown>{message.content}</Markdown>
                                    </div>
                                </div>
                            </article>
                        ))}

                        {sendMessage.isPending ? (
                            <article className="chat-message chat-message--assistant">
                                <span className="chat-message__avatar"><Bot size={17} aria-hidden="true" /></span>
                                <div><span className="chat-message__author">Queue Assistant</span><p className="chat-typing" aria-label="Assistant is responding"><span /><span /><span /></p></div>
                            </article>
                        ) : null}

                        {history.isError ? (
                            <div className="chat-error" role="alert">
                                <strong>Conversation unavailable</strong>
                                <p>{history.error.message}</p>
                                <button type="button" className="secondary-button" onClick={() => history.refetch()}>Try again</button>
                            </div>
                        ) : null}

                        {sendMessage.isError ? <p className="chat-send-error" role="alert">{sendMessage.error.message}</p> : null}
                        <div ref={endOfConversationRef} />
                    </div>

                    <form className="chat-composer" onSubmit={handleSubmit}>
                        <label htmlFor="assistant-message">Message Queue Assistant</label>
                        <div className="chat-composer__input">
                            <textarea
                                id="assistant-message"
                                value={input}
                                onChange={event => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={MAX_MESSAGE_LENGTH}
                                rows={2}
                                placeholder="Ask about open queues, wait time, or your status…"
                                disabled={history.isLoading || sendMessage.isPending}
                            />
                            <button type="submit" aria-label="Send message" disabled={!input.trim() || history.isLoading || sendMessage.isPending}>
                                <Send size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="chat-composer__footer"><span>Enter to send · Shift + Enter for a new line</span><span>{input.length}/{MAX_MESSAGE_LENGTH}</span></div>
                    </form>
                </section>

                <aside className="chat-info" aria-label="About Queue Assistant">
                    <article className="panel">
                        <Sparkles size={20} aria-hidden="true" />
                        <h2>What I can do</h2>
                        <ul>
                            <li>Find open restaurant queues</li>
                            <li>Check your position and updates</li>
                            <li>Join a waitlist for your party</li>
                            <li>Leave an active queue</li>
                        </ul>
                    </article>
                    <article className="panel chat-info__note">
                        <Clock3 size={20} aria-hidden="true" />
                        <div><h2>Faster answers</h2><p>Include your party size when asking to join a queue.</p></div>
                    </article>
                    <article className="panel chat-info__note">
                        <ShieldCheck size={20} aria-hidden="true" />
                        <div><h2>Account-aware</h2><p>The assistant only manages queues connected to your signed-in account.</p></div>
                    </article>
                </aside>
            </div>
        </section>
    )
}
