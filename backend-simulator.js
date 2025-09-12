// This file simulates a local Node.js application running on the user's machine.
// It communicates with the frontend via a simulated WebSocket connection.

export class MockBackend {
    constructor({ onOpen, onMessage, onClose, onError }) {
        this.onOpen = onOpen;
        this.onMessage = onMessage;
        this.onClose = onClose;
        this.onError = onError;
        this.connectionTimeout = null;
        this.buildProcess = null;
    }

    connect() {
        console.log("SIM: Attempting connection to backend...");
        // Simulate network delay
        this.connectionTimeout = setTimeout(() => {
            if (Math.random() > 0.05) { // 95% success rate
                console.log("SIM: Connection successful.");
                this.onOpen();
            } else {
                console.error("SIM: Connection failed.");
                this.onError();
            }
        }, 1500);
    }

    disconnect() {
        clearTimeout(this.connectionTimeout);
        clearTimeout(this.buildProcess);
        this.onClose();
    }

    send(data) {
        console.log("SIM: Received message from frontend:", data);
        if (data.type === 'select-project') {
            this.handleProjectSelection(data.payload);
        } else if (data.type === 'build') {
            this.handleBuildRequest(data.payload);
        }
    }

    // --- Private Simulation Methods ---

    handleProjectSelection(project) {
        // Simulate backend acknowledging the project selection
        setTimeout(() => {
            this.onMessage({
                type: 'log',
                level: 'info',
                message: `Backend ready to build '${project.title}'.`
            });
        }, 500);
    }
    
    handleBuildRequest({ projectId, platform }) {
        const buildSteps = [
            { msg: 'Validating project structure...', delay: 1000 },
            { msg: 'Installing dependencies (npm install)...', delay: 3000 },
            { msg: `Packaging code for ${platform}...`, delay: 2000 },
            { msg: `Compiling with Electron Forge...`, delay: 4000 },
            { msg: `Signing the application...`, delay: 1500 },
            { msg: `Finalizing executable...`, delay: 1000 },
        ];
        
        let stepIndex = 0;

        const executeStep = () => {
            if (stepIndex < buildSteps.length) {
                const step = buildSteps[stepIndex];
                this.onMessage({ type: 'log', level: 'info', message: step.msg });
                stepIndex++;
                this.buildProcess = setTimeout(executeStep, step.delay);
            } else {
                // Build finished
                this.onMessage({ type: 'build-complete', platform });
            }
        };

        executeStep();
    }
}

