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
    if (!text) return;

    const newMessage = {
      message: text,
      direction: 'outgoing',
      sender: 'user',
    };

    const newMessages = [...messages, newMessage];

    setMessages(newMessages);

    // Initial system message to determine ChatGPT functionality
    // How it responds, how it talks, etc.
    setIsTyping(true);
    await processMessageToChatGPT(newMessages);
  };

  async function processMessageToChatGPT(chatMessages) {
    // messages is an array of messages
    // Format messages for chatGPT API
    // API is expecting objects in format of { role: "user" or "assistant", "content": "message here"}
    // So we need to reformat

    let apiMessages = chatMessages.map((messageObject) => {
      let role = '';
      if (messageObject.sender === 'ChatGPT') {
        role = 'assistant';
      } else {
        role = 'user';
      }
      return { role: role, content: messageObject.message };
    });

    // The server holds the OpenAI key and adds the system instructions,
    // so the browser only sends the conversation itself.
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        // console.log(data);
        setMessages([
          ...chatMessages,
          {
            message: data.reply,
            sender: 'ChatGPT',
          },
        ]);
        setIsTyping(false);
      })
      .catch((err) => {
        enqueueSnackbar(
          'Error happened , please try to submit response again ',
          { variant: 'error' }
        );
      });
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
            <MessageInput placeholder="Type message here" onSend={handleSend} />
          </ChatContainer>
        </MainContainer>
      </SnackbarProvider>
    </div>
  );
}

export default App;
