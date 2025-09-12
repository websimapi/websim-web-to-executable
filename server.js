const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket bridge server started on ws://localhost:8080");

wss.on('connection', ws => {
    console.log('Frontend connected to the bridge.');
    ws.send(JSON.stringify({ type: 'log', level: 'info', message: 'Bridge connection established.' }));

    let currentProject = null;

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            console.log('Received message from frontend:', data.type);

            switch (data.type) {
                case 'select-project':
                    currentProject = data.payload;
                    console.log(`Selected project: ${currentProject.title}`);
                    ws.send(JSON.stringify({ type: 'log', level: 'info', message: `Project "${currentProject.title}" selected.` }));
                    break;

                case 'build':
                    if (!currentProject) {
                        ws.send(JSON.stringify({ type: 'error', message: 'No project selected.' }));
                        return;
                    }
                    handleBuild(ws, data.payload);
                    break;
                
                default:
                    console.log("Unknown message type:", data.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message from frontend.' }));
        }
    });

    ws.on('close', () => {
        console.log('Frontend disconnected.');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleBuild(ws, { projectId, platform }) {
    console.log(`Starting build for project ${projectId} on platform ${platform}`);
    
    // Simulate a build process with logs
    const sendLog = (message, level = 'info') => {
        ws.send(JSON.stringify({ type: 'log', level, message }));
    };

    sendLog(`Fetching project source for ${projectId}...`, 'info');
    
    setTimeout(() => {
        sendLog('Source code downloaded. Preparing build environment...', 'info');
    }, 1000);

    setTimeout(() => {
        sendLog(`Installing dependencies for ${platform}...`, 'command');
    }, 2000);
    
    setTimeout(() => {
        sendLog('Dependencies installed successfully.', 'success');
    }, 3500);

    setTimeout(() => {
        sendLog(`Packaging application for ${platform}...`, 'command');
    }, 4000);
    
    setTimeout(() => {
        // This is a simulation. In a real scenario, you would
        // use a tool like Electron Packager or Electron Builder here.
        const executableName = platform === 'windows' ? 'WebApp.exe' : (platform === 'macos' ? 'WebApp.app' : 'WebApp.AppImage');
        sendLog(`Created executable: ${executableName}`, 'success');
        
        ws.send(JSON.stringify({
            type: 'build-complete',
            platform: platform,
            downloadUrl: '#' // Placeholder URL
        }));
    }, 6000);
}