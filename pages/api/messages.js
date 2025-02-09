import { Message } from '../../database';

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const { text, sender, ProjectId } = req.body;

    try {
      const newMessage = await Message.create({ text, sender, ProjectId });
      res.status(200).json(newMessage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save message' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default handler;