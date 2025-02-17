import { Document } from '../../database';
import fs from 'fs';
import path from 'path';

const handler = async (req, res) => {
  if (req.method === 'DELETE') {
    const { id } = req.body;

    try {
      const document = await Document.findByPk(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Delete the file from the public/files folder
      const filePath = path.join(process.cwd(), 'public', document.filePath);
      fs.unlinkSync(filePath);

      // Delete the document from the database
      await Document.destroy({ where: { id } });

      res.status(204).end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default handler;