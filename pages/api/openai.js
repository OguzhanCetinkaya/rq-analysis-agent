import OpenAI from "openai";
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});


const handler = async (req, res) => {
  if (req.method === 'POST') {
    const { messages } = req.body;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        store: true
      });

      const aiMessage = {
        text: response.choices[0].message.content,
        sender: 'ai',
        ProjectId: messages[0].ProjectId,
      };

      res.status(200).json(aiMessage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default handler;