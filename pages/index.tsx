/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';
import React from 'react';
import { Typewriter } from 'react-simple-typewriter';

//const MemoizedTypewriter = React.memo(Typewriter);

interface MessageItemProps {
  message: Message;
  index: number;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, index }) => {
  const isApiMessage = message.type === 'apiMessage';

  const icon = (
    <Image
      src={isApiMessage ? '/bot.svg' : '/user.svg'}
      alt={isApiMessage ? 'AI' : 'Me'}
      width="30"
      height="30"
      className={isApiMessage ? styles.boticon : styles.usericon}
      priority={true}
      key={index}
    />
  );

  const className = isApiMessage ? styles.apimessage : styles.usermessage;

  return (
    <div key={`chatMessage-${index}`} className={className}>
      {icon}
      <div className={styles.markdownanswer}>
        {isApiMessage ? (
          <Typewriter
            words={[message.message]}
            cursor={false}
            typeSpeed={20}
          />
        ) : (
          <ReactMarkdown linkTarget={'_blank'}>{message.message}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if window is defined before using it
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.log('useLocalStorage read error:', error);
        return initialValue;
      }
    } else {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      // Check if window is defined before using it
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.log('useLocalStorage write error:', error);
    }
  };

  return [storedValue, setValue];
}



export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionUsage, setSessionUsage] = useState<number>(3);
  const [dailyUsage, setDailyUsage] = useLocalStorage<number>('dailyUsage', 100);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hello, Ask me about Beyin Technology!',
        type: 'apiMessage',
        sourceDocs: [],
      },
    ],
    history: [],
  });

  const { messages, history } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  

  const resetDailyUsage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentDate = new Date().toLocaleDateString();
      const lastUsageDate = window.localStorage.getItem('lastUsageDate');

      if (lastUsageDate !== currentDate) {
        window.localStorage.setItem('lastUsageDate', currentDate);
        setDailyUsage(100);
      }
    }
  }, [setDailyUsage]);

  useEffect(() => {
    resetDailyUsage();
  }, [resetDailyUsage]);

  const decrementSessionUsage = () => {
    setSessionUsage(sessionUsage - 1);
  };

  useEffect(() => {
    setSessionUsage(15);
  }, []);

  

  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();

    setError(null);

    if (sessionUsage <= 0) {
      alert('No more usage left for this session.');
      return;
    }

    if (dailyUsage <= 0) {
      alert('No more usage left for today.');
      return;
    }

    decrementSessionUsage();
    setDailyUsage(dailyUsage - 1);


    // Display remaining usage alert and hide it after 3 seconds
    setAlertMessage(`Remaining session usage: ${sessionUsage - 1}`);
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 5000);

    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();

    function isMessage(obj: any): obj is Message {
      return (
        typeof obj.type === "string" &&
        (obj.type === "apiMessage" || obj.type === "userMessage") &&
        typeof obj.message === "string"
      );
    }

    setMessageState((state) => {
      const newMessages = [
        ...state.messages,
        {
          type: "userMessage",
          message: question,
        },
      ].filter(isMessage);
    
      return {
        ...state,
        messages: newMessages,
      };
    });

    setLoading(true);
    setQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
        }),
      });
      const data = await response.json();
      console.log('data', data);

      if (data.error) {
        setError(data.error);
      } else {
        setMessageState((state) => {
          const newMessages = [
            ...state.messages,
            {
              type: "apiMessage",
              message: data.text,
              sourceDocs: data.sourceDocuments,
            },
          ].filter(isMessage);
      
          return {
            ...state,
            messages: newMessages,
            history: [...state.history, [question, data.text]],
          };
        });
      }
      console.log('messageState', messageState);

      setLoading(false);

      //scroll to bottom
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    } catch (error) {
      setLoading(false);

      const errorMessage = 'Sorry, something went wrong. Please try again.';

      setMessageState((state) => {
        const pendingMessage = state.pending ?? errorMessage;

        return {
          history: [...state.history, [question, pendingMessage]],
          messages: [
            ...state.messages,
            {
              type: 'apiMessage',
              message: pendingMessage,
              sourceDocs: state.pendingSourceDocs,
            },
          ],
          pending: undefined,
          pendingSourceDocs: undefined,
        };
      });

      console.log('error', error);
    }
  }

  const isSubmitDisabled = useMemo(() => {
    return loading || sessionUsage <= 0 || dailyUsage <= 0;
  }, [loading, sessionUsage, dailyUsage]);

  //prevent empty submissions
  const handleEnter = (e: any) => {
    if (e.key === 'Enter' && query) {
      handleSubmit(e);
    } else if (e.key == 'Enter') {
      e.preventDefault();
    }
  };



  return (
    <>
      <Head>
        <title>Beyin | AI</title>
        <meta name="description" content="GPT-4 interface" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <div data-overlay-dark="3" className="boxSize">
        <iframe
          src="https://www.thedxi.com/video/about"
          className="iframe"
          width="100%"
          height="100%"
        />
        <div className="box">
          <p className="img" />
        </div>

        <main className={`mainBox ${styles.main}`}>
          <div className={styles.cloud}>
            <div ref={messageListRef} className={styles.messagelist}>
            {messages.map((message, index) => (
  <MessageItem key={`chatMessage-${index}`} message={message} index={index} />
))}
            </div>
          </div>
          <div className={styles.center}>
            {alertVisible && (
              <div className={styles.alert}>
                <p>{alertMessage}</p>
              </div>
            )}
            {sessionUsage <= 0 || dailyUsage <= 0 ? (
              <div className="boxText">
                <p className="textAlret">
                  Oops! You have exhausted all of your available messages for this session.
                  For more information please contact us.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  disabled={isSubmitDisabled}
                  onKeyDown={handleEnter}
                  ref={textAreaRef}
                  autoFocus={true}
                  rows={1}
                  minLength={10}
                  id="userInput"
                  name=""
                  placeholder={
                    loading ? 'Ben is typing...' : 'Type your question...'
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={styles.textarea}
                />
                {loading ? (
                  <div className={styles.loadingwheel}>
                    <LoadingDots color="#ffffff" />
                  </div>
                ) : (
                  <button type="submit" className={styles.sendbutton}>
                    <Image
                      src="/send.svg"
                      alt="send"
                      width="25"
                      height="25"
                      className={styles.sendicon}
                      priority={true}
                    />
                  </button>
                )}
              </form>
            )}
            <footer>
              <p>
                Our experimental AI system is here to enhance your Beyin
                experience. While we strive for accuracy, please note that AI
                suggestions do not replace professional advice or our services.
                We value your feedback to improve the quality of the AI bot.
              </p>
            </footer>
          </div>
        </main>
        <div className="boxImg">
          <img src="/gpt.png" alt="gpt icon" className="" />
        </div>
      </div>
    </>
  );
}
