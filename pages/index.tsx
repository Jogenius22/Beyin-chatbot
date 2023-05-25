import { Message, PDFChunk } from "@/types";
import endent from "endent";
import Head from "next/head";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "@/styles/Home.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import LoadingDots from "@/components/ui/LoadingDots";
import React from "react";
import { Typewriter } from "react-simple-typewriter";
import App from "next/app";
import AppComponent from "@/components/Card";
import CardLayout from "@/components/CardLayout";

interface MessageItemProps {
  message: Message;
  index: number;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, index }) => {
  const isApiMessage = message.type === "apiMessage";

  const icon = (
    <Image
      src={isApiMessage ? "/bot.svg" : "/user.svg"}
      alt={isApiMessage ? "AI" : "Me"}
      width={30}
      height={30}
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
          <Typewriter words={[message.message]} cursor={false} typeSpeed={20} />
        ) : (
          <ReactMarkdown linkTarget={"_blank"}>{message.message}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if window is defined before using it
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.log("useLocalStorage read error:", error);
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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.log("useLocalStorage write error:", error);
    }
  };

  return [storedValue, setValue];
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCardLayout, setShowCardLayout] = useState(true);

  const [query, setQuery] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [sessionUsage, setSessionUsage] = useState<number>(3);
  const [dailyUsage, setDailyUsage] = useLocalStorage<number>(
    "dailyUsage",
    100
  );
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    history: [string, string][];
  }>({
    messages: [
      {
        message: "Hello, Ask me about Beyin Technology!",
        type: "apiMessage",
      },
    ],
    history: [],
  });

  const { messages } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  const matchCount = 5;

  const resetDailyUsage = useCallback(() => {
    if (typeof window !== "undefined") {
      const currentDate = new Date().toLocaleDateString();
      const lastUsageDate = window.localStorage.getItem("lastUsageDate");

      if (lastUsageDate !== currentDate) {
        window.localStorage.setItem("lastUsageDate", currentDate);
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

  const handleAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sessionUsage <= 0) {
      alert("No more usage left for this session.");
      return;
    }

    if (dailyUsage <= 0) {
      alert("No more usage left for today.");
      return;
    }

    setShowCardLayout(false);

    decrementSessionUsage();
    setDailyUsage(dailyUsage - 1);

    // Display remaining usage alert and hide it after 3 seconds
    setAlertMessage(`Remaining session usage: ${sessionUsage - 1}`);
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
    }, 5000);

    if (!query) {
      alert("Please enter a query.");
      return;
    }

    setAnswer("");

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
    setQuery("");

    try {
      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, matches: matchCount }),
      });

      if (!searchResponse.ok) {
        console.error(searchResponse.statusText);
        setAnswer("Sorry, something went wrong.");
        setLoading(false);
        return;
      }

      const results: PDFChunk[] = await searchResponse.json();

      const prompt = endent`
        You are a helpful AI assistant. query: "${query}"
    
        ${results?.map((d: any) => d.content).join("\n\n")}
    `;

      const answerResponse = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, query }),
      });

      if (!answerResponse.ok) {
        console.error(answerResponse.statusText);
        setAnswer("Sorry, something went wrong.");
        setLoading(false);
        return;
      }

      const data = await answerResponse.text();

      if (!data) {
        return;
      }

      setLoading(false);

      setAnswer(data);
      setMessageState((state) => {
        const newMessages = [
          ...state.messages,
          {
            type: "apiMessage",
            message: data,
          },
        ].filter(isMessage);

        return {
          ...state,
          messages: newMessages,
        };
      });

      inputRef.current?.focus();
    } catch (error) {
      console.error(error);
      setAnswer("Sorry, something went wrong.");
      setLoading(false);
    }
  };
  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleAnswer(e);
    }
  };

  const isSubmitDisabled = useMemo(() => {
    return loading || sessionUsage <= 0 || dailyUsage <= 0;
  }, [loading, sessionUsage, dailyUsage]);

  const handleEnter = (e: any) => {
    if (e.key === "Enter" && query) {
      handleAnswer(e);
    } else if (e.key == "Enter") {
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
          {showCardLayout && <CardLayout onTextClick={setQuery} />}
          {!showCardLayout && (
            <div className={styles.cloud}>
              <div ref={messageListRef} className={styles.messagelist}>
                {messages.map((message, index) => (
                  <MessageItem
                    key={`chatMessage-${index}`}
                    message={message}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}
          <div className={styles.center}>
            {alertVisible && (
              <div className={styles.alert}>
                <p>{alertMessage}</p>
              </div>
            )}
            {sessionUsage <= 0 || dailyUsage <= 0 ? (
              <div className="boxText">
                <p className="textAlret">
                  Oops! You have exhausted all of your available messages for
                  this session. For more information please contact us.
                </p>
              </div>
            ) : (
              <form className="inputForm" onSubmit={handleAnswer}>
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
                    loading ? "Ben is typing..." : "Type your question..."
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
          <Image src="/gpt.png" alt="gpt icon" width={168} height={84} />
        </div>
      </div>
    </>
  );
}
