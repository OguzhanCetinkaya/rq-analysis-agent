import { openai, assistantId } from "@/app/openai";
import formidable from 'formidable';
import fs from 'fs';

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

// upload file to assistant's vector store
const handler = async (req, res) => {
  if (req.method === 'POST') {

    const form = formidable({ multiples: false, uploadDir: `${process.cwd()}/public/files`, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'File upload error' });
      }

      const file = files.file[0];

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

      // upload using the file stream
      const openaiFile = await openai.files.create({
        file: fs.createReadStream(file.path),
        purpose: "assistants",
      });

      // add file to vector store
      await openai.beta.vectorStores.files.create(vectorStoreId, {
        file_id: openaiFile.id,
      });

      res.status(200).json();
    });
  }
  // list files in assistant's vector store
  else if (req.method === 'GET') {
    const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
    const fileList = await openai.beta.vectorStores.files.list(vectorStoreId);
  
    const filesArray = await Promise.all(
      fileList.data.map(async (file) => {
        const fileDetails = await openai.files.retrieve(file.id);
        const vectorFileDetails = await openai.beta.vectorStores.files.retrieve(
          vectorStoreId,
          file.id
        );
        return {
          file_id: file.id,
          filename: fileDetails.filename,
          status: vectorFileDetails.status,
        };
      })
    );
    res.status(200).json(filesArray);
  }
  // delete file from assistant's vector store
  else if (req.method === 'DELETE'){
    const body = await req.json();
    const fileId = body.fileId;
  
    const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
    await openai.beta.vectorStores.files.del(vectorStoreId, fileId); // delete file from vector store
  
    return res.status(200).json();
  }
}

export default handler;