import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai";
import { loadEnvConfig } from "@next/env";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";


loadEnvConfig("");

const generateEmbeddings = async (docs: any[]) => {
  try {
    console.log('generateEmbeddings called');

    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Define the batch size
    const batchSize = 10;

    // Process the chunks in batches
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);

      // Generate embeddings for the batch
      const embeddingResponses = await Promise.all(batch.map(doc => {
        const { pageContent: content } = doc;
        return openai.createEmbedding({
          model: "text-embedding-ada-002",
          input: content
        });
      }));

      // Prepare the data for the insert operation
      const data = batch.map((doc, index) => {
        const { pageContent: content } = doc;
        const [{ embedding }] = embeddingResponses[index].data.data;
        return { content, embedding };
      });

      // Perform the insert operation
      const { error } = await supabase
        .from("pg")
        .insert(data);

      if (error) {
        console.log("error", error);
      } else {
        console.log("saved", i, "-", i + batchSize - 1);
      }
    }

    console.log('generateEmbeddings completed');
  } catch (error) {
    console.error(error);
  }
};



const docsgpt3_5Turbo = async () => {
  const loader = new PDFLoader("./docs/data.pdf");

  const rawDocs = await loader.load();
  
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 50,
  });
  
  const pageContents = rawDocs.map(doc => doc.pageContent);
  const docs = await textSplitter.createDocuments(pageContents);
  
  await generateEmbeddings(docs);
};

docsgpt3_5Turbo();
