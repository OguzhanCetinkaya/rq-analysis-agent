import { openai } from "@/app/openai";

export const runtime = "nodejs";

const handler = async (req, res) => {
  if (req.method === 'POST') {
    try {
        const thread = await openai.beta.threads.create();
        res.status(200).json({ threadId: thread.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create thread' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default handler;
