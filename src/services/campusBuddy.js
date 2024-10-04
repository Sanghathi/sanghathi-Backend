/* eslint-disable node/file-extension-in-import */
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createClient } from "@supabase/supabase-js";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pull } from "langchain/hub";
import logger from "../utils/logger.js";

class CampusBuddy {
  constructor() {
    this.model = new ChatOpenAI({
      model: "gpt-3.5-turbo-1106",
      temperature: 0.9,
      openAIApiKey: process.env.OPEN_API_KEY,
    });
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PRIVATE_KEY
    );
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPEN_API_KEY,
    });
  }

  handleError(error) {
    // Log the error using your logger
    logger.error(`ERROR 💥 ${error}`);
    // Throw the error to propagate it to the calling code
    throw error;
  }

  async buildIndex(filePath) {
    try {
      const loader = new JSONLoader(filePath);
      const docs = await loader.load();
      await SupabaseVectorStore.fromDocuments(docs, this.embeddings, {
        client: this.client,
        tableName: "documents",
        queryName: "match_documents",
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async generateResponse(query) {
    try {
      logger.info("Step 1: Create vector store from existing index");
      const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        this.embeddings,
        {
          client: this.client,
          tableName: "documents",
          queryName: "match_documents",
        }
      );

      logger.info("Step 2: Create retriever from vector store");
      const retriever = vectorStore.asRetriever();

      logger.info("Step 3: Create question answering prompt");
      const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          "Answer the user's questions based on the below context:\n\n{context}",
        ],
        ["human", "{input}"],
      ]);

      logger.info(
        "Step 4: Create the combineDocsChain using createStuffDocumentsChain"
      );
      const combineDocsChain = await createStuffDocumentsChain({
        llm: this.model,
        prompt: questionAnsweringPrompt,
        outputParser: new StringOutputParser(),
      });

      logger.info("Step 5: Create the retrieval chain");
      const chain = await createRetrievalChain({
        retriever,
        combineDocsChain,
      });

      logger.info("Step 6: Invoke the chain with the query");
      const chainRes = await chain.invoke({ input: query });

      return chainRes.answer;
    } catch (error) {
      logger.error("Error in chain call", {
        error: error.message,
        stack: error.stack,
      });
      // Throw the error to propagate it to the calling code
      throw error;
    }
  }
}

export default new CampusBuddy();
