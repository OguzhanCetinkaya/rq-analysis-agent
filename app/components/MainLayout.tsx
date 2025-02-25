import { useState, useEffect } from "react";
import { Plus, FileUp, Send, Trash2, X, Loader, FileText, File } from "lucide-react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import mammoth from "mammoth";
import { marked } from "marked";
import { version as pdfjsVersion } from "pdfjs-dist";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface Project {
  id: string;
  name: string;
  Documents: Document[];
  Messages: Message[];
}

interface Document {
  id: string;
  name: string;
  filePath: string;
  ProjectId: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  ProjectId: string;
}

const MainLayout = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "txt" | "md" | "doc" | "unsupported" | null>(null);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    const fetchProjects = async () => {
      const response = await fetch('/api/projects');
      const projects = await response.json();
      setProjects(projects);
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setDocuments(selectedProject.Documents || []);
      setMessages(selectedProject.Messages || []);
    } else {
      setDocuments([]);
      setMessages([]);
    }
  }, [selectedProject]);

  const handleNewProject = async () => {
    const projectName = prompt("Enter project name:");
    if (projectName) {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName }),
      });
      const newProject = await response.json();
      setProjects((prev) => [...prev, newProject]);
      setSelectedProject(newProject);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      // Delete all documents associated with the project
      const projectDocuments = documents.filter((doc) => doc.ProjectId === projectId);
      for (const doc of projectDocuments) {
        await fetch('/api/documents', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: doc.id }),
        });
      }
  
      // Delete the project
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: projectId }),
      });
  
      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
      } else {
        console.error('Failed to delete project');
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const allowedFileTypes = ['application/pdf', 'text/markdown', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
    if (file && selectedProject && allowedFileTypes.includes(file.type)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProject.id);
  
      // Upload the file to the server
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (uploadResponse.ok) {
        const newDocument = await uploadResponse.json();
        setDocuments((prev) => [...prev, newDocument]);
  
        // Add a new message to the database
        const newMessage = {
          text: `A new document named ${newDocument.name} is uploaded.`,
          sender: 'developer',
          ProjectId: selectedProject.id,
        };
  
        const messageResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMessage),
        });
  
        if (messageResponse.ok) {
          const responseData = await messageResponse.json();
          const {messages, documents} = responseData;
          setMessages(messages);
        } else {
          console.error('Failed to save message');
        }
      } else {
        console.error('File upload failed');
      }
    } else {
      alert('Invalid file type. Only PDF, MD, TXT, DOC, and DOCX files are allowed.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      const documentToDelete = documents.find((d) => d.id === docId);
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: docId }),
      });
  
      if (response.ok) {
        setDocuments(documents.filter((d) => d.id !== docId));
        if (selectedDocument?.id === docId) {
          setSelectedDocument(null);
          setShowPreview(false);
        }
  
        // Add a new message to the database
        const newMessage = {
          text: `${documentToDelete.name} document is deleted.`,
          sender: 'developer',
          ProjectId: selectedProject.id,
        };
  
        const messageResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newMessage),
        });

        if (messageResponse.ok) {
          const responseData = await messageResponse.json();
          const {messages, documents} = responseData;
          setMessages(messages);
        } else {
          console.error('Failed to save message');
        }
      } else {
        console.error('Failed to delete document');
      }
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedProject) {
      const newUserMessage = {
        text: newMessage,
        sender: "user",
        ProjectId: selectedProject.id,
      };

      setIsAiProcessing(true);
  
      // Save the user message to the database
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserMessage),
      });
  
      if (!response.ok) {
        console.error('Failed to save user message');
        setIsAiProcessing(false);
        return;
      }
      const responseData = await response.json();
      const {messages, documents} = responseData;

      setMessages(messages);
      setDocuments(documents);
      setNewMessage("");
      setIsAiProcessing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, projectId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      const response = await fetch(`/api/messages?id=${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
  
      if (response.ok) {
        setMessages(messages.filter((message) => message.id !== messageId));
      } else {
        console.error('Failed to delete message');
      }
    }
  };

  const handleDocumentClick = async (document: Document) => {
    setSelectedDocument(document);
    setShowPreview(true);
    console.log("### Document", document);
    const type = document.filePath.split(".").pop()?.toLowerCase() || "";

    if (type === "pdf") {
      setPreviewType("pdf");
      setPreviewContent(document.filePath);
    } else if (type === "txt" || type === "md") {
      const response = await fetch(document.filePath);
      const content = await response.text();
      setPreviewType(type);
      setPreviewContent(content);
    } else if (type === "doc" || type === "docx") {
      setPreviewType("doc");
      try {
        const minimalDocx = new ArrayBuffer(100);
        const view = new Uint8Array(minimalDocx);
        view[0] = 0x50; // 'P'
        view[1] = 0x4b; // 'K'
        view[2] = 0x03; // '\x03'
        view[3] = 0x04; // '\x04'

        const result = await mammoth.convertToHtml({ arrayBuffer: minimalDocx });
        setPreviewContent(result.value);
      } catch (error) {
        console.error("Error converting DOC file:", error);
        setPreviewContent("Error loading document: " + error.message);
      }
    } else {
      setPreviewType("unsupported");
      setPreviewContent("Unsupported file type");
    }
  };

  const renderPreview = () => {
    switch (previewType) {
      case "pdf":
        return (
          <Worker workerUrl={`https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`}>
            <div style={{ height: "100%" }}>
              <Viewer fileUrl={previewContent} plugins={[defaultLayoutPluginInstance]} />
            </div>
          </Worker>
        );
      case "txt":
        return <pre className="whitespace-pre-wrap">{previewContent}</pre>;
      case "md":
        return <div dangerouslySetInnerHTML={{ __html: marked(previewContent) }} />;
      case "doc":
        return <div dangerouslySetInnerHTML={{ __html: previewContent }} />;
      default:
        return <p>{previewContent}</p>;
    }
  };

  return (
    <div className="h-full flex bg-gray-100">
      {/* Left Pane - Projects */}
      <div className="w-64 p-4 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Projects</h2>
          <button onClick={handleNewProject} className="p-2 hover:bg-blue-100 rounded-full">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                selectedProject?.id === project.id ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              <span onClick={() => setSelectedProject(project)}>{project.name}</span>
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="p-1 hover:bg-red-100 rounded-full text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Pane - Documents */}
      <div className="w-72 p-4 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Documents</h2>
          {selectedProject && (
            <label className="p-2 hover:bg-blue-100 rounded-full cursor-pointer">
              <FileUp size={20} />
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
            </label>
          )}
        </div>
        <div className="space-y-2">
          {documents && documents.map((document) => (
            <div
              key={document.id}
              className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                selectedDocument?.id === document.id ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              <span onClick={() => handleDocumentClick(document)} className="flex items-center">
                {document.name.endsWith(".pdf") ? (
                  <FileText size={16} className="mr-2" />
                ) : (
                  <File size={16} className="mr-2" />
                )}
                {document.name}
              </span>
              <button
                onClick={() => handleDeleteDocument(document.id)}
                className="p-1 hover:bg-red-100 rounded-full text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane - Chat and Preview */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Document Preview Modal */}
        {showPreview && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg w-3/4 h-3/4 p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 border rounded p-4 overflow-auto">{renderPreview()}</div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Chat History</h2>
          </div>
          {selectedProject ? (
            messages.map((message) => {
              // Determine background color based on sender
              const getBackgroundColor = () => {
                switch (message.sender) {
                  case "user":
                    return "bg-blue-500 text-white";
                  case "developer":
                    return "bg-[#D2292D] text-white";
                  default: // assistant
                    return "bg-gray-100";
                }
              };

              return (
                <div
                  key={message.id}
                  className={`mb-3 p-2 rounded-lg max-w-3xl flex justify-between items-center chat-message ${
                    message.sender === "assistant" ? "" : "ml-auto"
                  } ${getBackgroundColor()}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: marked(message.text) }} />
                  {/* Only show delete button for non-developer messages */}
                  {message.sender !== "developer" && (
                    <button
                      onClick={() => handleDeleteMessage(message.id, selectedProject.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a project to start the conversation
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedProject ? "Type your message..." : "Select a project to start chatting"}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              disabled={!selectedProject}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center disabled:bg-blue-300"
              disabled={isAiProcessing || !selectedProject}
            >
              {isAiProcessing ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;