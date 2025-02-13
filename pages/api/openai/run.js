import OpenAI from "openai";
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const assistant_id = process.env.OPENAI_ASSISTANT_ID;

const handler = async (req, res) => {
  if (req.method === 'POST') {
    try {
        const { message } = req.body;
        let run = await openai.beta.threads.runs.createAndPoll(
            thread.id,
            { 
              assistant_id: assistant_id,
              instructions: message
            }
          );
          if (run.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(
              run.thread_id
            );
            for (const message of messages.data.reverse()) {
              console.log(`${message.role} > ${message.content[0].text.value}`);
            }
          } else {
            console.log(run.status);
          }
        res.status(200).json({ threadId: thread.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create thread' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

const runHandler = async (run) => {
    if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(
          run.thread_id
        );
        for (const message of messages.data.reverse()) {
          console.log(`${message.role} > ${message.content[0].text.value}`);
        }
      } else {
        console.log(run.status);
      }
}
export default handler;