import formidable from 'formidable';
import fs from 'fs';
import { Document } from '../../database';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadHandler = async (req, res) => {
  if (req.method === 'POST') {
    //const form = formidable({ multiples: false, uploadDir: path.join(process.cwd(), 'public/files'), keepExtensions: true });
    const form = formidable({ multiples: false, uploadDir: `${process.cwd()}/public/files`, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'File upload error' });
      }

      const { projectId } = fields;
      const file = files.file[0];

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const newFilePath = form.uploadDir +'/'+ file.newFilename;

      fs.renameSync(file.filepath, newFilePath);

      const newDocument = await Document.create({
        name: file.originalFilename,
        filePath: `public/files/${file.newFilename}`,
        content: '',
        ProjectId: projectId,
      });

      res.status(200).json(newDocument);
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default uploadHandler;