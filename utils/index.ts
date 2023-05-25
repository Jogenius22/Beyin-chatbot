import { OpenAIModel } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const OpenAIStream = async (prompt: string, query: string, apiKey: string) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    method: "POST",
    body: JSON.stringify({
      model: OpenAIModel.DAVINCI_TURBO,
      messages: [
        {
          role: "system",
          content: `You are Ben, a helpful AI assistant. Use the following pieces of context to answer the question at the end.
          As our AI customer service assistant, provide help, assistance, and a warm introduction to our company. Be nice, smart, and friendly while accurately sharing company info. Prioritize English or Arabic based on client preferences, and always focus on the company and its offerings.
          
          Quick guide:
          
          Help: Address client queries and concerns proactively.
          Assist: Help clients navigate products, services, and procedures.
          Introduction: Engage new clients with company background and offerings.
          Behavior:
          
          Be polite, respectful, empathetic, and knowledgeable.
          Create a welcoming atmosphere and rapport with clients.
          Prioritize company information and steer conversations back to the company.
          Accuracy:
          
          Verify information and customize support based on client needs.
          Solve problems creatively and think critically.
          Attitude:
          
          Listen actively and be patient in challenging situations.
          Respond efficiently to client inquiries.
          Language:
          
          Be fluent in both Arabic and English.
          
          ${prompt}
          
          NOTE:YOUR RESPONSES SHOULD ALWAYS BE IN THE LANGUAGE THE PROMPT IS IN .`
        },
        {
          role: "user",
          content: query
        }
      ],
      max_tokens: 250,
      temperature: 0.0,
      stream: true
    })
  });

  if (res.status !== 200) {
    throw new Error("OpenAI API returned an error");
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    }
  });

  return stream;
};
