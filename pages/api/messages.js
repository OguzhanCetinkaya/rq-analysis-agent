import { Message, Project, Document } from '../../database';
import fs from 'fs';
import pdfParse from 'pdf-parse';

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
    
    if (sender != "developer")
    {
        // send to openai
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature:0.7,
            tools: tools, // Include the tool definition
            tool_choice: "auto", // Allows GPT-4o to decide when to call the tool
            max_completion_tokens:8000,
          });

          const assistantMessage = response.choices[0].message;
          if (assistantMessage.tool_calls) {
            for (const toolCall of assistantMessage.tool_calls) {
              if (toolCall.function.name === "create_document") {
                const args = JSON.parse(toolCall.function.arguments);
                console.log("GPT-4o requested to create a document with:", args);
      
                // Call the actual function to create a document
                createDocument(args.filename, args.title, args.content, ProjectId);

                const aiMessage = {
                  text: `The document "${args.filename}.md" has been created.`,
                  sender: 'assistant',
                  ProjectId,
                };
                await Message.create(aiMessage);
                const toolMessage = {
                  text: "I have created a document with the specified content.",
                  sender: 'developer',
                  ProjectId,
                };
                await Message.create(toolMessage);
              }
            }
          } else {
            const aiMessage = {
              text: response.choices[0].message.content,
              sender: 'assistant',
              ProjectId,
            };
            await Message.create(aiMessage);
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Failed to get AI response' });
        }
    }

    const updatedMessages = await get_messages(ProjectId);
    const updatedDocuments = await get_documents(ProjectId);
    res.status(200).json({ messages: updatedMessages, documents: updatedDocuments });

  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    const { projectId } = req.body;

    try {
      await Message.destroy({ where: { id } });
      const updatedMessages = await get_messages(projectId);
      res.status(200).json(updatedMessages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

const prepare_messages = async (projectId) => {
  const documents_content = await get_project_documents_content(projectId);
  const system_instructions = `
You are an AI System Analyst assisting a human system analyst in creating requirement analysis documents. Your primary responsibilities include analyzing project documents, detecting gaps or contradictions, proactively asking clarifying questions, and generating structured documents upon request.

# Document Handling
- You will process and incorporate text, markdown, and PDF documents into your context in the order they are uploaded.
- When a document is deleted, its content will be removed from your context.
- You will treat all uploaded documents equally, without distinguishing between types.
- You will silently incorporate changes when new documents are uploaded.

# Conversational Guidelines
- You will proactively ask questions when detecting gaps, inconsistencies, or missing details in the provided documents or conversation.
- You will only ask one short, clear, and concise question at a time.
- You will wait for a response before asking the next question.
- If the response is vague, you will ask for more details.
- You will provide one concise suggestion after the human analyst answers a question or sends a message.
- You will inform the human analyst that you can summarize key points but only do so when explicitly requested.
- You will not categorize or tag questions and suggestions.
- You will not provide citations or references to document sections.
- You will not adapt your questioning style dynamically; you will maintain a consistent approach.
- You will not detect or adjust to conversation loops.

# Conflict Resolution
- If you detect contradictions or conflicts in the provided documents or conversation, you will state the issue and ask for clarification.
- If an uploaded document introduces ambiguity or incompleteness, you will ask the analyst about these gaps.

# Document Creation
- You will have access to a tool for document creation with the following parameters: title and content.
- You will generate documents only when explicitly asked to do so by the human analyst.
- The generated document will be based on your context and conversation history.
- The human analyst will review and may request changes to the generated document.

# Interaction Format
- You will interact with the human analyst through a text-based chat.
- When the conversation starts, you will immediately analyze the available documents and conversation context and ask a specific project-related question instead of a broad question.
- You will not ask broad or generic questions like "What do you need help with?" Instead, you will directly engage with project-specific details.
- You will not log interactions or store past conversations beyond the current session.

# Available Documents
Here you can find the available documents below:
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
    },
    order: [['createdAt', 'ASC']]
  });

  return messages;
}

const get_documents = async (projectId) => {
  const documents = await Document.findAll({
    where: {
      ProjectId: projectId
    }
  });

  return documents;
}

const get_project_documents_content = async (projectId) => {
  const documents = await get_project_documents(projectId);
  if (!documents.length) {
    return 'No documents uploaded yet.';
  }
  const contentPromises = documents.map((document) => get_document_content(document.id));
  const contents = await Promise.all(contentPromises);

  let content_text = "Here are the documents in this project:\n\n";
  for (let i = 0; i < documents.length; i++) {
    content_text += `${i + 1}. Document Name: ${documents[i].name}\n`;
    content_text += 'Content:\n' + contents[i] + '\n\n';
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

const tools = [
  {
    type: "function",
    function: {
      name: "create_document",
      description: "Creates a markdown document in a specific folder.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "The name of the markdown file (without extension)." },
          title: { type: "string", description: "The title of the markdown file." },
          content: { type: "string", description: "The content of the markdown file." }
        },
        required: ["filename", "content"]
      }
    }
  }
];

const createDocument = async (filename, title, content, projectId) => {
  try {
    // Define the full path for the markdown file
    const filePath = `${process.cwd()}/public/files/${filename}.md`;

    // Write content to the file
    fs.writeFileSync(filePath, content);

    // Add document to database
    const newDocument = await Document.create({
      name: title,
      filePath: `files/${filename}.md`,
      content: '',
      ProjectId: projectId,
    });

    console.log(`Markdown file created: ${filePath}`);
  } catch (error) {
    console.error('Error creating document:', error);
  }
}


export default handler;