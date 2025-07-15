// VSCode API reference
const vscode = acquireVsCodeApi();

// Application state
let currentState = {
    projects: [],
    actions: {},
    outputFiles: {},
    currentProject: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    requestInitialState();
});

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'updateState':
            currentState = message.state;
            updateUI();
            break;
    }
});

function initializeEventListeners() {
    // Project selector
    const projectSelect = document.getElementById('project-select');
    projectSelect.addEventListener('change', (e) => {
        const selectedProject = e.target.value;
        sendMessage('setProject', { project: selectedProject });
    });

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Footer buttons
    document.getElementById('copy-for-ai').addEventListener('click', copyForAI);
    document.getElementById('open-output-dir').addEventListener('click', openOutputDirectory);
}

function sendMessage(command, data = {}) {
    vscode.postMessage({
        command: command,
        data: data
    });
}

function requestInitialState() {
    sendMessage('getStatus');
    sendMessage('getProjects');
}

function updateUI() {
    updateProjectSelector();
    updateActionButtons();
    updateOutputFiles();
    updateLastRun();
}

function updateProjectSelector() {
    const projectSelect = document.getElementById('project-select');
    
    // Clear existing options (except the first placeholder)
    while (projectSelect.children.length > 1) {
        projectSelect.removeChild(projectSelect.lastChild);
    }
    
    // Add project options
    currentState.projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.name;
        option.textContent = `${project.name} (${project.projectType})`;
        
        if (project.name === currentState.currentProject) {
            option.selected = true;
        }
        
        projectSelect.appendChild(option);
    });
}

function updateActionButtons() {
    const container = document.querySelector('.action-buttons');
    container.innerHTML = '';
    
    Object.values(currentState.actions).forEach(action => {
        const button = createActionButton(action);
        container.appendChild(button);
    });
}

function createActionButton(action) {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'action-button';
    
    const statusIcon = getStatusIcon(action.status);
    const isRunning = action.status === 'running';
    
    buttonDiv.innerHTML = `
        <div class="action-header">
            <span class="action-icon">${getActionIcon(action.icon)}</span>
            <span class="action-label">${action.label}</span>
            <span class="status-icon ${action.status}">${statusIcon}</span>
        </div>
        <div class="action-controls">
            <button 
                class="run-button ${isRunning ? 'running' : ''}" 
                ${isRunning || !action.enabled ? 'disabled' : ''}
                onclick="runAction('${action.id}')"
            >
                ${isRunning ? 'Running...' : 'Run'}
            </button>
            ${action.lastRun ? `<span class="last-run">Last run: ${formatTime(action.lastRun)}</span>` : ''}
        </div>
    `;
    
    return buttonDiv;
}

function getActionIcon(iconName) {
    const iconMap = {
        'debug-alt': '🤖',
        'beaker': '🧪',
        'git-compare': '📋',
        'rocket': '🚀'
    };
    return iconMap[iconName] || '📄';
}

function getStatusIcon(status) {
    switch (status) {
        case 'running':
            return '⏳';
        case 'success':
            return '✅';
        case 'error':
            return '❌';
        default:
            return '';
    }
}

function runAction(actionId) {
    if (!currentState.currentProject && (actionId !== 'gitDiff')) {
        vscode.postMessage({
            command: 'showError',
            message: 'Please select a project first'
        });
        return;
    }
    
    sendMessage('runCommand', {
        action: actionId,
        project: currentState.currentProject
    });
}

function updateOutputFiles() {
    const filesContent = document.getElementById('files-content');
    filesContent.innerHTML = '';
    
    if (Object.keys(currentState.outputFiles).length === 0) {
        filesContent.innerHTML = '<p>No output files generated yet. Run a command to see results.</p>';
        return;
    }
    
    Object.entries(currentState.outputFiles).forEach(([type, content]) => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'output-file';
        
        const fileName = getFileNameForType(type);
        const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
        
        fileDiv.innerHTML = `
            <div class="file-header">
                <span class="file-name" onclick="openFile('${type}')">${fileName}</span>
                <button class="copy-button" onclick="copyContent('${type}')">📋</button>
            </div>
            <div class="file-preview">
                <pre>${escapeHtml(preview)}</pre>
            </div>
        `;
        
        filesContent.appendChild(fileDiv);
    });
}

function getFileNameForType(type) {
    const fileMap = {
        'ai-debug-context': 'ai-debug-context.txt',
        'jest-output': 'jest-output.txt',
        'diff': 'diff.txt',
        'pr-description': 'pr-description-prompt.txt'
    };
    return fileMap[type] || `${type}.txt`;
}

function openFile(type) {
    const fileName = getFileNameForType(type);
    sendMessage('openFile', { filePath: fileName });
}

function copyContent(type) {
    const content = currentState.outputFiles[type];
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            showToast('Content copied to clipboard');
        });
    }
}

function updateLastRun() {
    const outputContent = document.getElementById('output-content');
    
    if (currentState.lastRun) {
        const { action, timestamp, success } = currentState.lastRun;
        const status = success ? '✅ Success' : '❌ Failed';
        const time = formatTime(timestamp);
        
        outputContent.innerHTML = `
            <div class="last-run-info">
                <h3>Last Command: ${action}</h3>
                <p>Status: ${status}</p>
                <p>Time: ${time}</p>
            </div>
        `;
    } else {
        outputContent.innerHTML = '<p>Run a command to see results here...</p>';
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function copyForAI() {
    const contextContent = currentState.outputFiles['ai-debug-context'];
    if (contextContent) {
        navigator.clipboard.writeText(contextContent).then(() => {
            showToast('AI Debug context copied to clipboard');
        });
    } else {
        showToast('No AI debug context available. Run AI Debug Analysis first.', 'warning');
    }
}

function openOutputDirectory() {
    sendMessage('openFile', { filePath: '.' });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add some basic styling for toast notifications
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        background: var(--vscode-notifications-background);
        color: var(--vscode-notifications-foreground);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .toast-warning {
        background: var(--vscode-notificationsWarningIcon-foreground);
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
