import { Message, Project, Document } from '../../database';
import fs from 'fs';

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const { text, sender, ProjectId } = req.body;

    // prepare messages
    const messages = await prepare_messages(ProjectId);
    
    // send to openai
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
        ProjectId,
      };

      res.status(200).json(aiMessage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }

    // save to database
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

const prepare_messages = async (projectId) => {
  const messages = await get_project_messages(projectId);
  const documents_content = await get_project_documents_content(projectId);

  return messages.map((message) => message.text).concat(documents_content);
}

const get_project_messages = async (projectId) => {
  const messages = await Message.findAll({
    where: {
      ProjectId: projectId
    }
  });

  return messages;
}

const get_project_documents_content = async (projectId) => {
  const documents = await get_project_documents(projectId);
  const contentPromises = documents.map((document) => get_document_content(document.id));
  const contents = await Promise.all(contentPromises);

  let content_text = "Here are the documents in this project:\n";
  for (let i = 0; i < documents.length; i++) {
    content_text += `${i + 1}. ${documents[i].name}\n`;
    content_text += contents[i] + '\n\n';
  }
  return content_text;
}

const get_project_documents = async (projectId) => {
  const project = await Project.findByPk(projectId, {
    include: [Document]
  });

  return project.Documents;
};

const get_document_content = async (documentId) => {
  const document = await Document.findByPk(documentId);
  const filepath = document.filePath;

  let content = '';

  if (filepath.endsWith('.pdf')) {
    content = await extract_pdf_text(filepath);
  } else if (filepath.endsWith('.txt')) {
    content = await fs.readFileSync(filepath, 'utf-8');
  }

  return content;
};

const extract_pdf_text = async (filepath) => {
  const dataBuffer = fs.readFileSync(filepath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

export default handler;