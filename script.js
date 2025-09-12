const DOM = {
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    projectSelection: document.getElementById('project-selection'),
    projectListLoader: document.getElementById('project-list-loader'),
    projectList: document.getElementById('project-list'),
    searchBar: document.getElementById('search-bar'),
    buildControls: document.getElementById('build-controls'),
    selectedProjectName: document.getElementById('selected-project-name'),
    platformButtons: document.querySelectorAll('.platform-btn'),
    outputLog: document.getElementById('output-log'),
    logOutput: document.getElementById('log-output'),
    downloadSection: document.getElementById('download-section'),
    downloadButton: document.getElementById('download-button'),
    downloadBridgeBtn: document.getElementById('download-bridge-btn'),
};

let projects = [];
let selectedProjectId = null;
let isBuilding = false;
let ws;

// --- WebSocket Bridge Connection ---

function connectWebSocket() {
    // Close any existing connection
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
    }

    ws = new WebSocket('ws://localhost:8080');
    updateStatus('connecting', 'Connecting...');

    ws.onopen = () => {
        console.log("WebSocket connection established.");
        updateStatus('connected', 'Connected to Bridge');
        DOM.projectSelection.classList.remove('hidden');
        fetchProjects();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleBackendMessage(data);
        } catch (error) {
            console.error("Error parsing message from backend:", error);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed.");
        updateStatus('error', 'Bridge Disconnected');
        disableAllSections();
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateStatus('error', 'Connection Failed');
        disableAllSections();
        // The onclose event will fire next, which will handle reconnection logic.
    };
}

function handleBackendMessage(data) {
    if (data.type === 'log') {
        appendLog(data.message, data.level);
    } else if (data.type === 'build-complete') {
        appendLog(`✅ Build successful for ${data.platform}!`, 'success');
        DOM.downloadButton.onclick = () => alert(`Downloading your ${data.platform} executable... (simulation)`);
        DOM.downloadSection.classList.remove('hidden');
        finishBuild();
    } else if (data.type === 'error') {
        appendLog(`❌ Error: ${data.message}`, 'error');
        finishBuild();
    }
}

function sendToBackend(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    } else {
        console.error("WebSocket is not open. Cannot send message.");
        appendLog("Cannot send command: bridge is not connected.", "error");
    }
}

// --- Download Bridge Logic ---
async function downloadBridgeFiles() {
    const btn = DOM.downloadBridgeBtn;
    btn.disabled = true;
    btn.textContent = 'Packaging...';

    try {
        const zip = new JSZip();
        
        const filesToZip = {
            'server.js': '/server.js',
            'package.json': '/package.json',
            'README.md': '/README.md',
            'start.sh': '/bash'
        };

        for (const [fileName, filePath] of Object.entries(filesToZip)) {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filePath}`);
            }
            const content = await response.text();
            zip.file(fileName, content);
        }

        // Add a Windows start script
        const batContent = `@echo off
echo Installing dependencies...
call npm install
echo.
echo Starting bridge server...
call npm start
`;
        zip.file('start.bat', batContent);


        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'web-to-executable-bridge.zip');
        
    } catch (error) {
        console.error('Error creating zip file:', error);
        alert('Could not create the download file. Please check the console for errors.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Download Node.js Bridge (.zip)';
    }
}

// --- UI Updates ---
function updateStatus(status, text) {
    DOM.statusDot.className = `dot ${status}`;
    DOM.statusText.textContent = text;
}

function appendLog(message, level = 'info') {
    const entry = document.createElement('span');
    entry.className = `log-entry ${level}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n`;
    DOM.logOutput.appendChild(entry);
    DOM.logOutput.parentElement.scrollTop = DOM.logOutput.parentElement.scrollHeight;
}

function clearLog() {
    DOM.logOutput.innerHTML = '';
}

function finishBuild() {
    isBuilding = false;
    DOM.platformButtons.forEach(btn => {
        btn.classList.remove('building');
        btn.disabled = false;
    });
}

function disableAllSections() {
    DOM.projectSelection.classList.add('hidden');
    DOM.buildControls.classList.add('hidden');
    DOM.outputLog.classList.add('hidden');
}

// --- Project Logic ---
async function fetchProjects() {
    try {
        const creator = await window.websim.getCreator();
        if (!creator) {
            throw new Error("Could not identify the creator.");
        }
        
        // This is a hypothetical API endpoint. We'll use mocked data for this example.
        // const response = await fetch(`/api/v1/users/${creator.username}/projects`);
        // if (!response.ok) throw new Error('Failed to fetch projects');
        // const data = await response.json();
        // projects = data.projects;

        // Mocked data:
        projects = [
            { id: 'proj_1', title: 'My Portfolio', description: 'Personal portfolio website built with React.' },
            { id: 'proj_2', title: 'E-commerce Store', description: 'A fully functional online store.' },
            { id: 'proj_3', title: 'Weather App', description: 'Displays weather using a third-party API.' },
            { id: 'proj_4', title: 'Blog Platform', description: 'A simple markdown-based blog.' },
            { id: 'proj_5', title: 'Task Manager', description: 'A to-do list application.' },
        ];

    } catch (error) {
        console.error("Project fetch error:", error);
        appendLog(`Error fetching projects: ${error.message}`, 'error');
        projects = []; // Fallback to empty list
    } finally {
        DOM.projectListLoader.classList.add('hidden');
        renderProjects(projects);
    }
}

function renderProjects(projectsToRender) {
    DOM.projectList.innerHTML = '';
    if (projectsToRender.length === 0) {
        DOM.projectList.innerHTML = '<li class="project-item">No projects found.</li>';
        return;
    }
    projectsToRender.forEach(project => {
        const li = document.createElement('li');
        li.className = 'project-item';
        li.dataset.projectId = project.id;
        li.innerHTML = `
            <div>
                <div class="title">${project.title}</div>
                <div class="description">${project.description}</div>
            </div>
            <span>▶</span>
        `;
        li.addEventListener('click', () => selectProject(project.id));
        DOM.projectList.appendChild(li);
    });
}

function selectProject(projectId) {
    selectedProjectId = projectId;
    const selectedProject = projects.find(p => p.id === projectId);
    
    // Update UI
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.projectId === projectId);
    });

    DOM.selectedProjectName.textContent = selectedProject.title;
    DOM.buildControls.classList.remove('hidden');
    DOM.platformButtons.forEach(btn => btn.classList.add('ready'));
    DOM.outputLog.classList.add('hidden'); // Hide log on new selection
    DOM.downloadSection.classList.add('hidden');

    clearLog();
    appendLog(`Selected project: ${selectedProject.title}`);
    sendToBackend({
        type: 'select-project',
        payload: selectedProject
    });
}

// --- Event Listeners ---
DOM.searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProjects = projects.filter(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
    );
    renderProjects(filteredProjects);
});

DOM.platformButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!selectedProjectId || isBuilding) return;

        const platform = button.dataset.platform;
        isBuilding = true;
        
        DOM.platformButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('ready');
            if (btn === button) {
                btn.classList.add('building');
            }
        });
        
        DOM.outputLog.classList.remove('hidden');
        DOM.downloadSection.classList.add('hidden');
        clearLog();
        appendLog(`Starting build for ${platform}...`, 'command');
        
        sendToBackend({
            type: 'build',
            payload: {
                projectId: selectedProjectId,
                platform: platform,
            }
        });
    });
});

DOM.downloadBridgeBtn.addEventListener('click', downloadBridgeFiles);

// --- Initialisation ---
function init() {
    connectWebSocket();
}

init();