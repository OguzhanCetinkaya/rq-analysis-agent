import { Message, Project, Document } from '../../database';
import fs from 'fs';

import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers";
const openai = wrapOpenAI(new OpenAI({apiKey: process.env.OPENAI_API_KEY}));


const handler = async (req, res) => {
  if (req.method === 'POST') {
    const { text, sender, ProjectId } = req.body;

    // save user message to database
    try {
      const newMessage = await Message.create({ text, sender, ProjectId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save message' });
    }

    // prepare messages
    const messages = await prepare_messages(ProjectId);
    
    // send to openai
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        store: true
      });

      const aiMessage = {
        text: response.choices[0].message.content,
        sender: 'assistant',
        ProjectId,
      };

      // save assistant message to database
      try {
        const newMessage = await Message.create(aiMessage);
        const updatedMessages = await get_messages(ProjectId);
        res.status(200).json(updatedMessages);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save message' });
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

const prepare_messages = async (projectId) => {
  const documents_content = await get_project_documents_content(projectId);
  const system_instructions = `
    You are an AI Requirements Gathering Assistant. Your primary goal is to guide the user through the process of defining and clarifying requirements for a project or system. You will:

    1. Welcome and interact with users in a friendly, professional manner.
    2. Ask clarifying questions to gather complete requirements.
    3. Prompt users to upload relevant documents.
    4. Parse the contents of any uploaded files, and incorporate key insights into the requirement analysis.
    5. Maintain a working “draft” of the requirements analysis document as the conversation progresses.
    6. Keep track of any changes, updates, or newly provided data (whether via conversation or uploaded documents).
    7. Once a user has confirmed you have captured everything, finalize the requirements analysis document and produce a new version.

    **Behavior Requirements**:
    - Always ensure all required information is captured—ask specific follow-up questions if details are missing or unclear.
    - Confirm with the user before creating or finalizing a new version of the analysis document.
    - If the user uploads new files or provides new details, update your draft and ask if any additional context is needed.
    - Produce a well-organized Requirements Analysis Document once the user explicitly confirms everything is ready.
    - Maintain a version history so that each finalized document is stored separately from previous drafts.

    **Important**:
    - Only finalize (i.e., output) the Requirements Analysis Document after the user confirms all details are collected.
    - You have access to certain specialized tools that help with storing, retrieving, and summarizing uploaded files; see below.
    - If the user’s request is outside the scope of gathering or clarifying requirements, respond politely or refuse if it violates any policy.
  
    ${documents_content}
  `
  const system_message = {
    role: "system",
    content: [{
      type: 'text',
      text: system_instructions,
    }]
  };
  let openai_messages = [];
  openai_messages.push(system_message);

  const messages = await get_messages(projectId);
  for (let i = 0; i < messages.length; i++) {
    openai_messages.push({
      role: messages[i].sender,
      content: [{
        type: 'text',
        text: messages[i].text,
      }]
    });
  }


  return openai_messages;
}

const get_messages = async (projectId) => {
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

  let content_text = "Here are the documents in this project:\n\n";
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
  const filepath = `${process.cwd()}/public/${document.filePath}`;
  
  let content = '';


  if (filepath.endsWith('.pdf')) {
    content = await extract_pdf_text(filepath);
  } else if (filepath.endsWith('.txt')) {
    content = fs.readFileSync(filepath, 'utf-8');
  }

  return content;
};

const extract_pdf_text = async (filepath) => {
  const dataBuffer = fs.readFileSync(filepath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

export default handler;