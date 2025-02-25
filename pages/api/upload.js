import formidable from 'formidable';
import fs from 'fs';
import { Document } from '../../database';
import { openai, assistantId } from "@/app/openai";

const getOrCreateVectorStore = async () => {
  const assistant = await openai.beta.assistants.retrieve(assistantId);

  // if the assistant already has a vector store, return it
  if (assistant.tool_resources?.file_search?.vector_store_ids?.length > 0) {
    return assistant.tool_resources.file_search.vector_store_ids[0];
  }
  // otherwise, create a new vector store and attatch it to the assistant
  const vectorStore = await openai.beta.vectorStores.create({
    name: "sample-assistant-vector-store",
  });
  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });
  return vectorStore.id;
};

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
        filePath: `files/${file.newFilename}`,
        content: '',
        ProjectId: projectId,
      });

      const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

      // upload using the file stream
      const openaiFile = await openai.files.create({
        file: fs.createReadStream(newFilePath),
        purpose: "assistants",
      });

      // add file to vector store
      await openai.beta.vectorStores.files.create(vectorStoreId, {
        file_id: openaiFile.id,
      });

      res.status(200).json(newDocument);
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default uploadHandler;