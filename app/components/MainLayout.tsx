import { useState, useEffect } from "react";
import { Plus, Upload, Send, Trash2, X, Loader, FileText, File } from "lucide-react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import mammoth from "mammoth";
import { marked } from "marked";
import { version as pdfjsVersion } from "pdfjs-dist";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const MainLayout = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);

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
      setDocuments(selectedProject.Documents);
      setMessages(selectedProject.Messages);
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

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: projectId }),
      });
      setProjects(projects.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
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
  
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const newDocument = await response.json();
        setDocuments((prev) => [...prev, newDocument]);
      } else {
        console.error('File upload failed');
      }
    } else {
      alert('Invalid file type. Only PDF, MD, TXT, DOC, and DOCX files are allowed.');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      setDocuments(documents.filter((d) => d.id !== docId));
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
        setShowPreview(false);
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

      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);
      setNewMessage("");

      setIsAiProcessing(true);
      setTimeout(async () => {
        const aiResponse = {
          text: "I'm analyzing your request and the project documents...",
          sender: "ai",
          ProjectId: selectedProject.id,
        };

        const finalMessages = [...updatedMessages, aiResponse];
        setMessages(finalMessages);
        setIsAiProcessing(false);
      }, 2000);
    }
  };

  const handleDocumentClick = async (document) => {
    setSelectedDocument(document);
    setShowPreview(true);

    const type = document.name.split(".").pop()?.toLowerCase() || "";

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
    <div className="flex h-screen bg-gray-100">
      {/* Left Pane - Projects */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Projects</h2>
          <button onClick={handleNewProject} className="p-2 hover:bg-gray-100 rounded-full">
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
      <div className="w-72 bg-white border-r border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Documents</h2>
          {selectedProject && (
            <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
              <Upload size={20} />
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
            </label>
          )}
        </div>
        <div className="space-y-2">
          {documents.map((document) => (
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
      <div className="flex-1 flex flex-col bg-white">
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
          {selectedProject ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 p-3 rounded-lg max-w-3xl ${
                  message.sender === "user" ? "ml-auto bg-blue-500 text-white" : "bg-gray-100"
                }`}
              >
                {message.text}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 mt-8">Select a project to start the conversation</div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
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