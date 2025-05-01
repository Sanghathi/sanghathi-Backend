// rag.js
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import 'dotenv/config';

const mongoClient = new MongoClient(process.env.MONGODB_URI2);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function semanticSearch(queryText) {
  await mongoClient.connect();
  const col = mongoClient.db('sample_mflix').collection('help_content');

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

  const docs = await col.aggregate(pipeline).toArray();
  await mongoClient.close();
  return docs;
}

export async function ragAnswer(userQuestion) {
  const hits = await semanticSearch(userQuestion);

  const context = hits
    .map(h => `— [${h.category} • ${h.option}]: ${h.text}`)
    .join('\n');

  const messages = [
    { role: 'system',    content: 'You are a helpful assistant.' },
    { role: 'developer', content: 'Talk like a pirate.' },
    { role: 'system',    content: `Use the following retrieved snippets:\n${context}` },
    { role: 'user',      content: userQuestion }
  ];

  const resp = await openai.chat.completions.create({
    model: 'gpt-4',
    messages
  });

  return resp.choices[0].message.content;
}
