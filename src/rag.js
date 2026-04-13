// rag.js
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const ragDbName = process.env.RAG_DB_NAME || 'sample_mflix';
const ragCollectionName = process.env.RAG_COLLECTION_NAME || 'help_content';

const mongoUris = [process.env.MONGODB_URI2, process.env.MONGODB_URI].filter(Boolean);

async function getConnectedMongoClient() {
  let lastError = null;

  for (const uri of mongoUris) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => {});
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('No MongoDB URI configured for RAG');
}

export async function semanticSearch(queryText) {
  const mongoClient = await getConnectedMongoClient();
  const col = mongoClient.db(ragDbName).collection(ragCollectionName);

  const embedding = (await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: queryText
  })).data[0].embedding;

  const pipeline = [
    {
      $vectorSearch: {
        index: 'CMRIT_index',
        path:  'embedding',
        queryVector: embedding,
        limit:       20,
        numCandidates: 50
      }
    },
    { $project: { category:1, option:1, text:1, _id:0 } }
  ];

  try {
    const docs = await col.aggregate(pipeline).toArray();
    return docs;
  } finally {
    await mongoClient.close();
  }
}

export async function ragAnswer(userQuestion) {
  const hits = await semanticSearch(userQuestion);

  const context = hits
    .map(h => `— [${h.category} • ${h.option}]: ${h.text}`)
    .join('\n');

  const messages = [
    { role: 'system',    content: 'You are a helpful campus assistant. Answer clearly and concisely.' },
    { role: 'system',    content: `Use the following retrieved snippets:\n${context}` },
    { role: 'user',      content: userQuestion }
  ];

  const resp = await openai.chat.completions.create({
    model: chatModel,
    messages
  });

  return resp.choices[0].message.content;
}
