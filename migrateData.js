// filepath: /Users/oguzhancetinkaya/Code/rq-analysis-agent/rq-analysis-agent/migrateData.js
const { sequelize, Project, Document, Message } = require('./database');

const projectsData = {
  1: {
    id: 1,
    name: "Project A",
    documents: [
      {
        id: 1,
        name: "requirements.pdf",
        content: "Initial requirements document",
        filePath: "files/requirements.pdf",
      },
      { id: 2, name: "specs.docx", content: "Technical specifications", filePath: "files/specs.docx" },
    ],
    messages: [
      { id: 1, text: "Hello! I'm your AI assistant. Let's analyze your project requirements.", sender: "ai" },
      { id: 2, text: "Can you tell me more about the project scope?", sender: "user" },
      {
        id: 3,
        text: "Based on the requirements document, I see this is a web application project. Let me ask a few questions...",
        sender: "ai",
      },
    ],
  },
  2: {
    id: 2,
    name: "Project B",
    documents: [{ id: 3, name: "proposal.pdf", content: "Project proposal details", filePath: "files/proposal.pdf" },
      { id: 4, name: "SDLC Agents.txt", content: "SDLC Agents", filePath: "files/SDLC Agents.txt" }
    ],
    messages: [
      { id: 1, text: "Hello! I'm your AI assistant. Let's analyze your project requirements.", sender: "ai" },
      { id: 4, text: "I've uploaded the proposal document.", sender: "user" },
      { id: 5, text: "Thank you. I'll analyze the proposal now...", sender: "ai" },
    ],
  },
};

const migrateData = async () => {
  await sequelize.sync({ force: true });

  for (const projectId in projectsData) {
    const projectData = projectsData[projectId];
    const project = await Project.create({ name: projectData.name });

    for (const document of projectData.documents) {
      await Document.create({ ...document, ProjectId: project.id });
    }

    for (const message of projectData.messages) {
      await Message.create({ ...message, ProjectId: project.id });
    }
  }

  console.log('Data migration completed.');
  process.exit();
};

migrateData();