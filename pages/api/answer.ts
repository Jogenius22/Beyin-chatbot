import { OpenAIStream } from "@/utils";

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { prompt, query } = (await req.json()) as {
      prompt: string;
      query: string;
    };

    // fetch the apiKey from the environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    if(!apiKey) {
      throw new Error("Missing API Key");
    }

    const stream = await OpenAIStream(prompt, query, apiKey);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
