// VSCode API reference
const vscode = acquireVsCodeApi();

// Application state
let currentState = {
    projects: [],
    actions: {},
    outputFiles: {},
    currentProject: null,
    isStreaming: false,
    currentOutput: ''
};

// Streaming state
let isLiveOutputVisible = false;
let outputBuffer = '';
let autoScroll = true;

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
            
        case 'streamingUpdate':
            handleStreamingUpdate(message.message);
            break;
    }
});

function handleStreamingUpdate(streamingMessage) {
    const { type, data, timestamp } = streamingMessage;
    
    switch (type) {
        case 'output':
            appendToLiveOutput(data.text, 'output');
            break;
            
        case 'error':
            appendToLiveOutput(data.text, 'error');
            break;
            
        case 'progress':
            updateProgress(data.progress, data.actionId);
            break;
            
        case 'status':
            updateStatus(data.status);
            break;
            
        case 'complete':
            handleCommandComplete(data.result, data.actionId);
            break;
    }
}

function appendToLiveOutput(text, type = 'output') {
    if (!isLiveOutputVisible) {
        showLiveOutput();
    }
    
    const liveOutput = document.getElementById('live-output');
    const outputLine = document.createElement('div');
    outputLine.className = `output-line ${type}`;
    
    // Format the text (basic ANSI color support could be added here)
    outputLine.textContent = text;
    
    liveOutput.appendChild(outputLine);
    
    // Auto-scroll to bottom if enabled
    if (autoScroll) {
        liveOutput.scrollTop = liveOutput.scrollHeight;
    }
    
    // Limit output lines to prevent memory issues
    const maxLines = 1000;
    while (liveOutput.children.length > maxLines) {
        liveOutput.removeChild(liveOutput.firstChild);
    }
}

function updateProgress(progress, actionId) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${progress}% complete`;
    }
    
    // Update action button progress
    if (actionId && currentState.actions[actionId]) {
        currentState.actions[actionId].progress = progress;
        updateActionButtons();
    }
}

function updateStatus(status) {
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = status;
    }
}

function handleCommandComplete(result, actionId) {
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    
    if (progressText) {
        const status = result.success ? '✅ Complete' : '❌ Failed';
        progressText.textContent = `${status} (${result.duration}ms)`;
    }
    
    if (progressFill) {
        progressFill.style.width = '100%';
        progressFill.className = `progress-fill ${result.success ? 'success' : 'error'}`;
    }
    
    // Add completion message to output
    const completionMsg = result.success 
        ? `\n✅ Command completed successfully in ${result.duration}ms\n`
        : `\n❌ Command failed: ${result.error || 'Unknown error'}\n`;
    
    appendToLiveOutput(completionMsg, result.success ? 'success' : 'error');
    
    // Hide live output after a delay
    setTimeout(() => {
        hideLiveOutput();
    }, 5000);
}

function showLiveOutput() {
    const streamingSection = document.getElementById('streaming-section');
    if (streamingSection) {
        streamingSection.style.display = 'block';
        isLiveOutputVisible = true;
        
        // Reset progress bar
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
            progressFill.className = 'progress-fill';
        }
        
        // Clear previous output
        const liveOutput = document.getElementById('live-output');
        if (liveOutput) {
            liveOutput.innerHTML = '';
        }
    }
}

function hideLiveOutput() {
    const streamingSection = document.getElementById('streaming-section');
    if (streamingSection) {
        streamingSection.style.display = 'none';
        isLiveOutputVisible = false;
    }
}

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

    // Streaming controls
    document.getElementById('cancel-command').addEventListener('click', cancelCommand);
    document.getElementById('clear-output').addEventListener('click', clearLiveOutput);

    // Footer buttons
    document.getElementById('copy-for-ai').addEventListener('click', copyForAI);
    document.getElementById('open-output-dir').addEventListener('click', openOutputDirectory);
    
    // Auto-scroll toggle (double-click on output area)
    document.getElementById('live-output').addEventListener('dblclick', toggleAutoScroll);
}

function cancelCommand() {
    sendMessage('cancelCommand');
    showToast('Cancelling command...', 'warning');
}

function clearLiveOutput() {
    const liveOutput = document.getElementById('live-output');
    if (liveOutput) {
        liveOutput.innerHTML = '';
    }
    sendMessage('clearOutput');
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const indicator = autoScroll ? '🔒' : '🔓';
    showToast(`Auto-scroll ${autoScroll ? 'enabled' : 'disabled'} ${indicator}`, 'info');
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
    updateStreamingUI();
}

function updateStreamingUI() {
    // Show/hide streaming section based on state
    if (currentState.isStreaming && !isLiveOutputVisible) {
        showLiveOutput();
    } else if (!currentState.isStreaming && isLiveOutputVisible) {
        // Keep visible for a moment to show completion
    }
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
    const progress = action.progress || 0;
    
    buttonDiv.innerHTML = `
        <div class="action-header">
            <span class="action-icon">${getActionIcon(action.icon)}</span>
            <span class="action-label">${action.label}</span>
            <span class="status-icon ${action.status}">${statusIcon}</span>
        </div>
        ${isRunning && progress > 0 ? `
        <div class="action-progress">
            <div class="mini-progress-bar">
                <div class="mini-progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-percent">${progress}%</span>
        </div>
        ` : ''}
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
    if (currentState.isStreaming) {
        showToast('Another command is already running. Please wait or cancel it first.', 'warning');
        return;
    }
    
    if (!currentState.currentProject && (actionId !== 'gitDiff')) {
        showToast('Please select a project first', 'warning');
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
                ${currentState.currentOutput ? `
                    <div class="output-summary">
                        <h4>Output Summary:</h4>
                        <pre class="output-preview">${escapeHtml(currentState.currentOutput.substring(0, 500))}${currentState.currentOutput.length > 500 ? '...' : ''}</pre>
                    </div>
                ` : ''}
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

// Add enhanced styling for streaming features
const streamingStyles = document.createElement('style');
streamingStyles.textContent = `
    /* Streaming Output Styles */
    .streaming-output {
        margin: 15px 0;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        background: var(--vscode-editor-background);
    }
    
    .output-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: var(--vscode-panel-background);
        border-bottom: 1px solid var(--vscode-panel-border);
    }
    
    .output-header h3 {
        margin: 0;
        font-size: 14px;
    }
    
    .output-controls {
        display: flex;
        gap: 5px;
    }
    
    .cancel-button, .clear-button {
        padding: 4px 8px;
        font-size: 11px;
        border: 1px solid var(--vscode-button-border);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 3px;
        cursor: pointer;
    }
    
    .cancel-button:hover, .clear-button:hover {
        background: var(--vscode-button-hoverBackground);
    }
    
    .progress-container {
        padding: 10px;
    }
    
    .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--vscode-progressBar-background);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 5px;
    }
    
    .progress-fill {
        height: 100%;
        background: var(--vscode-progressBar-background);
        transition: width 0.3s ease;
        border-radius: 4px;
    }
    
    .progress-fill.success {
        background: var(--vscode-terminal-ansiGreen);
    }
    
    .progress-fill.error {
        background: var(--vscode-terminal-ansiRed);
    }
    
    .progress-text {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
    }
    
    .live-output {
        max-height: 300px;
        overflow-y: auto;
        padding: 10px;
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
        line-height: 1.4;
        background: var(--vscode-terminal-background);
        color: var(--vscode-terminal-foreground);
    }
    
    .output-line {
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 2px;
    }
    
    .output-line.error {
        color: var(--vscode-terminal-ansiRed);
    }
    
    .output-line.success {
        color: var(--vscode-terminal-ansiGreen);
    }
    
    /* Action Button Progress */
    .action-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 5px 0;
    }
    
    .mini-progress-bar {
        flex: 1;
        height: 4px;
        background: var(--vscode-progressBar-background);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .mini-progress-fill {
        height: 100%;
        background: var(--vscode-progressBar-background);
        transition: width 0.3s ease;
        border-radius: 2px;
    }
    
    .progress-percent {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        min-width: 30px;
    }
    
    /* Enhanced Toast Styles */
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
        max-width: 300px;
    }
    
    .toast-warning {
        background: var(--vscode-notificationsWarningIcon-foreground);
        color: var(--vscode-editor-background);
    }
    
    .toast-info {
        background: var(--vscode-notificationsInfoIcon-foreground);
        color: var(--vscode-editor-background);
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    /* Output Summary */
    .output-summary {
        margin-top: 15px;
    }
    
    .output-preview {
        background: var(--vscode-textCodeBlock-background);
        padding: 10px;
        border-radius: 4px;
        font-size: 11px;
        max-height: 200px;
        overflow-y: auto;
    }
`;
document.head.appendChild(streamingStyles);