import { useState } from 'react';
import './App.css';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';

function App() {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm ChatGPT! Ask me anything!",
      sentTime: 'just now',
      sender: 'ChatGPT',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // MessageInput passes (innerHTML, textContent, innerText). Use the plain
  // text so markup typed by the user is not sent to the model as HTML.
  const handleSend = async (_html, _textContent, innerText) => {
    const text = innerText.trim();
    if (!text || isTyping) return;

    const newMessage = {
      message: text,
      direction: 'outgoing',
      sender: 'user',
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const reply = await requestReply(newMessages);
      setMessages([...newMessages, { message: reply, sender: 'ChatGPT' }]);
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      // Always clear the indicator, otherwise a failed request leaves
      // "ChatGPT is typing" on screen forever.
      setIsTyping(false);
    }
  };

  async function requestReply(chatMessages) {
    // Convert UI messages into the { role, content } shape the server expects.
    const apiMessages = chatMessages.map((messageObject) => ({
      role: messageObject.sender === 'ChatGPT' ? 'assistant' : 'user',
      content: messageObject.message,
    }));

    // The server holds the OpenAI key and adds the system instructions,
    // so the browser only sends the conversation itself.
    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.reply !== 'string') {
      throw new Error(data.error || 'Something went wrong, please try again.');
    }
    return data.reply;
  }

  return (
    <div className="App">
      <SnackbarProvider>
        <MainContainer>
          <ChatContainer>
            <MessageList
              scrollBehavior="smooth"
              typingIndicator={
                isTyping ? (
                  <TypingIndicator content="ChatGPT is typing" />
                ) : null
              }
            >
              {messages.map((message, i) => {
                // Render as plain text: model output must never be injected as HTML.
                return <Message key={i} model={{ ...message, type: 'text' }} />;
              })}
            </MessageList>
            <MessageInput
              placeholder="Type message here"
              onSend={handleSend}
              // Block new sends until the pending reply arrives so the
              // history sent to the server stays consistent.
              sendDisabled={isTyping}
              sendOnReturnDisabled={isTyping}
              // The attach button has no handler in this app.
              attachButton={false}
              autoFocus
            />
          </ChatContainer>
        </MainContainer>
      </SnackbarProvider>
    </div>
  );
}

export default App;
