"use client"

import { useState, useEffect } from "react"
import { Plus, Upload, Send, Trash2, X, Loader, FileText, File } from "lucide-react"
import { Viewer, Worker } from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import mammoth from "mammoth"

import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"

// Import pdfjs-dist for worker configuration
import { version } from "pdfjs-dist"

const MainLayout = () => {
  const [projectsData, setProjectsData] = useState({
    1: {
      id: 1,
      name: "Project A",
      documents: [
        { id: 1, name: "requirements.pdf", content: "Initial requirements document" },
        { id: 2, name: "specs.docx", content: "specs.docx" },
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
      documents: [{ id: 3, name: "Tom Lee-CTO1.1.1.Intro_v10.pdf", content: "Tom Lee-CTO1.1.1.Intro_v10.pdf" }],
      messages: [
        { id: 1, text: "Hello! I'm your AI assistant. Let's analyze your project requirements.", sender: "ai" },
        { id: 4, text: "I've uploaded the proposal document.", sender: "user" },
        { id: 5, text: "Thank you. I'll analyze the proposal now...", sender: "ai" },
      ],
    },
  })

  const [projects, setProjects] = useState(Object.values(projectsData))
  const [selectedProject, setSelectedProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState(null)
  const [previewType, setPreviewType] = useState(null)

  const defaultLayoutPluginInstance = defaultLayoutPlugin()

  useEffect(() => {
    if (selectedProject) {
      const projectData = projectsData[selectedProject.id]
      if (projectData) {
        setDocuments(projectData.documents)
        setMessages(projectData.messages)
      }
    } else {
      setDocuments([])
      setMessages([])
    }
  }, [selectedProject, projectsData])

  const handleNewProject = () => {
    const projectName = prompt("Enter project name:")
    if (projectName) {
      const newProject = {
        id: Math.max(...projects.map((p) => p.id), 0) + 1,
        name: projectName,
        documents: [],
        messages: [
          {
            id: 1,
            text: "Hello! I'm your AI assistant. Let's analyze your project requirements.",
            sender: "ai",
          },
        ],
      }

      setProjects((prev) => [...prev, newProject])
      setProjectsData((prev) => ({ ...prev, [newProject.id]: newProject }))
      setSelectedProject(newProject)
    }
  }

  const handleDeleteProject = (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter((p) => p.id !== projectId))
      setProjectsData((prev) => {
        const newData = { ...prev }
        delete newData[projectId]
        return newData
      })

      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
      }
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file && selectedProject) {
      const newDocument = {
        id: Math.max(...documents.map((d) => d.id), 0) + 1,
        name: file.name,
        content: `Preview content for ${file.name}`,
      }

      const updatedDocuments = [...documents, newDocument]
      setDocuments(updatedDocuments)
      setProjectsData((prev) => ({
        ...prev,
        [selectedProject.id]: {
          ...prev[selectedProject.id],
          documents: updatedDocuments,
        },
      }))
    }
  }

  const handleDeleteDocument = (docId) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      const updatedDocuments = documents.filter((d) => d.id !== docId)
      setDocuments(updatedDocuments)
      setProjectsData((prev) => ({
        ...prev,
        [selectedProject.id]: {
          ...prev[selectedProject.id],
          documents: updatedDocuments,
        },
      }))

      if (selectedDocument?.id === docId) {
        setSelectedDocument(null)
        setShowPreview(false)
      }
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedProject) {
      const newUserMessage = {
        id: Math.max(...messages.map((m) => m.id), 0) + 1,
        text: newMessage,
        sender: "user",
      }

      const updatedMessages = [...messages, newUserMessage]
      setMessages(updatedMessages)
      setProjectsData((prev) => ({
        ...prev,
        [selectedProject.id]: {
          ...prev[selectedProject.id],
          messages: updatedMessages,
        },
      }))
      setNewMessage("")

      setIsAiProcessing(true)
      setTimeout(() => {
        const aiResponse = {
          id: Math.max(...updatedMessages.map((m) => m.id), 0) + 1,
          text: "I'm analyzing your request and the project documents...",
          sender: "ai",
        }

        const finalMessages = [...updatedMessages, aiResponse]
        setMessages(finalMessages)
        setProjectsData((prev) => ({
          ...prev,
          [selectedProject.id]: {
            ...prev[selectedProject.id],
            messages: finalMessages,
          },
        }))
        setIsAiProcessing(false)
      }, 2000)
    }
  }

  const handleDocumentClick = async (document) => {
    setSelectedDocument(document)
    setShowPreview(true)

    const content = document.content
    const type = document.name.split(".").pop().toLowerCase()

    if (type === "pdf") {
      setPreviewType("pdf")
      setPreviewContent(content)
    } else if (type === "txt") {
      setPreviewType("txt")
      setPreviewContent(content)
    } else if (type === "doc" || type === "docx") {
      setPreviewType("doc")
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: content })
        setPreviewContent(result.value)
      } catch (error) {
        console.error("Error converting DOC file:", error)
        setPreviewContent("Error loading document")
      }
    } else {
      setPreviewType("unsupported")
      setPreviewContent("Unsupported file type")
    }
  }

  const renderPreview = () => {
    switch (previewType) {
      case "pdf":
        return (
          <Worker workerUrl={`https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`}>
            <div style={{ height: "100%" }}>
              <Viewer fileUrl={previewContent} plugins={[defaultLayoutPluginInstance]} />
            </div>
          </Worker>
        )
      case "txt":
        return <pre className="whitespace-pre-wrap">{previewContent}</pre>
      case "doc":
        return <div dangerouslySetInnerHTML={{ __html: previewContent }} />
      default:
        return <p>{previewContent}</p>
    }
  }

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
                  handleSendMessage()
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
  )
}

export default MainLayout

