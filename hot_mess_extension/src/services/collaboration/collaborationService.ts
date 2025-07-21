import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { 
    Session, 
    Participant, 
    SessionConfig, 
    SharedState, 
    CommandExecution,
    Annotation,
    CursorPosition,
    ChatMessage,
    CollaborationService as ICollaborationService
} from '../../types';

/**
 * CollaborationService implements real-time collaboration features for AI Debug Utilities
 * Phase 4.1: Core collaboration functionality including session management,
 * command sharing, and real-time synchronization
 */
export class CollaborationService extends EventEmitter implements ICollaborationService {
    private sessions: Map<string, Session> = new Map();
    private participants: Map<string, Participant> = new Map();
    private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly maxSessions = 10;
    private readonly defaultSessionDuration = 240; // 4 hours in minutes

    constructor(private context: vscode.ExtensionContext) {
        super();
        this.initializeService();
    }

    /**
     * Initialize the collaboration service
     */
    private initializeService(): void {
        // Load persisted sessions from extension context
        this.loadPersistedSessions();
        
        // Set up cleanup interval for expired sessions
        setInterval(() => this.cleanupExpiredSessions(), 60000); // Check every minute
        
        console.log('CollaborationService initialized');
    }

    /**
     * Create a new collaboration session
     */
    async createSession(config: SessionConfig): Promise<Session> {
        if (this.sessions.size >= this.maxSessions) {
            throw new Error(`Maximum number of sessions (${this.maxSessions}) reached`);
        }

        const sessionId = this.generateSessionId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (config.duration || this.defaultSessionDuration) * 60 * 1000);

        // Create the session owner
        const owner: Participant = {
            id: this.generateParticipantId(),
            name: await this.getCurrentUserName(),
            email: await this.getCurrentUserEmail(),
            role: 'owner',
            joinedAt: now,
            isOnline: true
        };

        const session: Session = {
            id: sessionId,
            name: config.name,
            participants: [owner],
            sharedState: {
                currentProject: config.project || '',
                activeCommands: [],
                annotations: [],
                cursorPositions: {},
                sharedFiles: [],
                chatMessages: []
            },
            createdAt: now,
            expiresAt,
            isActive: true,
            owner
        };

        this.sessions.set(sessionId, session);
        this.participants.set(owner.id, owner);
        
        // Set up session expiration
        this.setupSessionTimeout(sessionId, config.duration || this.defaultSessionDuration);
        
        // Persist session
        await this.persistSession(session);
        
        // Emit event
        this.emit('sessionCreated', session);
        
        // Show notification
        vscode.window.showInformationMessage(
            `Collaboration session "${config.name}" created. Session ID: ${sessionId}`,
            'Copy Session ID'
        ).then(selection => {
            if (selection === 'Copy Session ID') {
                vscode.env.clipboard.writeText(sessionId);
            }
        });
        
        console.log(`Session created: ${sessionId} with ${session.participants.length} participants`);
        return session;
    }

    /**
     * Join an existing collaboration session
     */
    async joinSession(sessionId: string, participant: Participant): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        if (!session.isActive) {
            throw new Error(`Session ${sessionId} is no longer active`);
        }

        if (new Date() > session.expiresAt) {
            throw new Error(`Session ${sessionId} has expired`);
        }

        // Check if participant already exists
        const existingParticipant = session.participants.find(p => p.id === participant.id);
        if (existingParticipant) {
            // Update existing participant status
            existingParticipant.isOnline = true;
            existingParticipant.joinedAt = new Date();
        } else {
            // Add new participant
            participant.joinedAt = new Date();
            participant.isOnline = true;
            session.participants.push(participant);
        }

        this.participants.set(participant.id, participant);
        await this.persistSession(session);
        
        // Add system message
        const joinMessage: ChatMessage = {
            id: this.generateId(),
            content: `${participant.name} joined the session`,
            author: participant,
            timestamp: new Date(),
            type: 'system'
        };
        session.sharedState.chatMessages.push(joinMessage);
        
        // Emit events
        this.emit('participantJoined', sessionId, participant);
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`Participant ${participant.name} joined session ${sessionId}`);
    }

    /**
     * Leave a collaboration session
     */
    async leaveSession(sessionId: string, participantId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const participant = session.participants.find(p => p.id === participantId);
        if (!participant) {
            throw new Error(`Participant ${participantId} not found in session`);
        }

        // Mark participant as offline
        participant.isOnline = false;
        
        // If this is the owner and there are other participants, transfer ownership
        if (participant.role === 'owner' && session.participants.length > 1) {
            const newOwner = session.participants.find(p => p.id !== participantId && p.isOnline);
            if (newOwner) {
                newOwner.role = 'owner';
                session.owner = newOwner;
            }
        }
        
        // If no participants are online, deactivate session
        const onlineParticipants = session.participants.filter(p => p.isOnline);
        if (onlineParticipants.length === 0) {
            session.isActive = false;
        }
        
        // Add system message
        const leaveMessage: ChatMessage = {
            id: this.generateId(),
            content: `${participant.name} left the session`,
            author: participant,
            timestamp: new Date(),
            type: 'system'
        };
        session.sharedState.chatMessages.push(leaveMessage);
        
        await this.persistSession(session);
        
        // Emit events
        this.emit('participantLeft', sessionId, participant);
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`Participant ${participant.name} left session ${sessionId}`);
    }

    /**
     * Share a command execution with session participants
     */
    async shareCommand(sessionId: string, command: CommandExecution): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Add command to shared state
        session.sharedState.activeCommands.push(command);
        
        // Create chat message for command sharing
        const commandMessage: ChatMessage = {
            id: this.generateId(),
            content: `Shared command: ${command.action} for project ${command.project}`,
            author: command.initiator,
            timestamp: new Date(),
            type: 'command',
            metadata: {
                commandId: command.id,
                action: command.action,
                project: command.project
            }
        };
        session.sharedState.chatMessages.push(commandMessage);
        
        await this.persistSession(session);
        
        // Emit events
        this.emit('commandShared', sessionId, command);
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`Command ${command.id} shared in session ${sessionId}`);
    }

    /**
     * Synchronize session state
     */
    async syncState(sessionId: string, state: SharedState): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Update shared state
        session.sharedState = { ...session.sharedState, ...state };
        
        await this.persistSession(session);
        
        // Emit event
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`State synchronized for session ${sessionId}`);
    }

    /**
     * Add an annotation to the session
     */
    async addAnnotation(sessionId: string, annotation: Annotation): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.sharedState.annotations.push(annotation);
        
        // Create chat message for annotation
        const annotationMessage: ChatMessage = {
            id: this.generateId(),
            content: `Added ${annotation.type}: ${annotation.content}`,
            author: annotation.author,
            timestamp: new Date(),
            type: 'system',
            metadata: {
                annotationId: annotation.id,
                type: annotation.type,
                position: annotation.position
            }
        };
        session.sharedState.chatMessages.push(annotationMessage);
        
        await this.persistSession(session);
        
        // Emit events
        this.emit('annotationAdded', sessionId, annotation);
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`Annotation ${annotation.id} added to session ${sessionId}`);
    }

    /**
     * Update cursor position for a participant
     */
    async updateCursor(sessionId: string, participantId: string, position: CursorPosition): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const participant = session.participants.find(p => p.id === participantId);
        if (!participant) {
            throw new Error(`Participant ${participantId} not found in session`);
        }

        // Update cursor position
        participant.cursor = position;
        session.sharedState.cursorPositions[participantId] = position;
        
        // Don't persist for cursor updates (too frequent)
        // await this.persistSession(session);
        
        // Emit event
        this.emit('cursorUpdated', sessionId, participantId, position);
        
        // console.log(`Cursor updated for participant ${participantId} in session ${sessionId}`);
    }

    /**
     * Send a chat message in the session
     */
    async sendChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.sharedState.chatMessages.push(message);
        
        await this.persistSession(session);
        
        // Emit event
        this.emit('messageReceived', sessionId, message);
        this.emit('stateChanged', sessionId, session.sharedState);
        
        console.log(`Message sent in session ${sessionId} by ${message.author.name}`);
    }

    /**
     * Get all active sessions
     */
    async getSessions(): Promise<Session[]> {
        return Array.from(this.sessions.values()).filter(session => session.isActive);
    }

    /**
     * Get a specific session
     */
    async getSession(sessionId: string): Promise<Session | null> {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Clear session timeout
        const timeout = this.sessionTimeouts.get(sessionId);
        if (timeout) {
            clearTimeout(timeout);
            this.sessionTimeouts.delete(sessionId);
        }

        // Remove participants
        session.participants.forEach(participant => {
            this.participants.delete(participant.id);
        });

        // Remove session
        this.sessions.delete(sessionId);
        
        // Remove from persistence
        await this.removePersistedSession(sessionId);
        
        // Emit event
        this.emit('sessionDeleted', sessionId);
        
        console.log(`Session ${sessionId} deleted`);
    }

    // Private helper methods

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateParticipantId(): string {
        return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async getCurrentUserName(): Promise<string> {
        // Try to get from Git config
        try {
            const gitConfig = await vscode.workspace.getConfiguration('git');
            const userName = gitConfig.get<string>('userName');
            if (userName) {
                return userName;
            }
        } catch (error) {
            // Fallback to system user
        }
        
        return process.env.USER || process.env.USERNAME || 'Unknown User';
    }

    private async getCurrentUserEmail(): Promise<string | undefined> {
        try {
            const gitConfig = await vscode.workspace.getConfiguration('git');
            return gitConfig.get<string>('userEmail');
        } catch (error) {
            return undefined;
        }
    }

    private setupSessionTimeout(sessionId: string, durationMinutes: number): void {
        const timeout = setTimeout(async () => {
            const session = this.sessions.get(sessionId);
            if (session) {
                session.isActive = false;
                await this.persistSession(session);
                this.emit('sessionExpired', sessionId);
                console.log(`Session ${sessionId} expired`);
            }
        }, durationMinutes * 60 * 1000);
        
        this.sessionTimeouts.set(sessionId, timeout);
    }

    private cleanupExpiredSessions(): void {
        const now = new Date();
        const expiredSessions: string[] = [];
        
        this.sessions.forEach((session, sessionId) => {
            if (now > session.expiresAt) {
                expiredSessions.push(sessionId);
            }
        });
        
        expiredSessions.forEach(sessionId => {
            this.deleteSession(sessionId).catch(error => {
                console.error(`Error cleaning up expired session ${sessionId}:`, error);
            });
        });
    }

    private async loadPersistedSessions(): Promise<void> {
        try {
            const persistedSessions = this.context.globalState.get<Session[]>('collaborationSessions', []);
            
            persistedSessions.forEach(session => {
                // Only load active, non-expired sessions
                if (session.isActive && new Date() < new Date(session.expiresAt)) {
                    this.sessions.set(session.id, {
                        ...session,
                        createdAt: new Date(session.createdAt),
                        expiresAt: new Date(session.expiresAt)
                    });
                    
                    // Restore participants
                    session.participants.forEach(participant => {
                        this.participants.set(participant.id, {
                            ...participant,
                            joinedAt: new Date(participant.joinedAt),
                            isOnline: false // Mark as offline on startup
                        });
                    });
                    
                    console.log(`Restored session: ${session.id}`);
                }
            });
        } catch (error) {
            console.error('Error loading persisted sessions:', error);
        }
    }

    private async persistSession(session: Session): Promise<void> {
        try {
            const allSessions = Array.from(this.sessions.values());
            await this.context.globalState.update('collaborationSessions', allSessions);
        } catch (error) {
            console.error(`Error persisting session ${session.id}:`, error);
        }
    }

    private async removePersistedSession(sessionId: string): Promise<void> {
        try {
            const allSessions = Array.from(this.sessions.values());
            await this.context.globalState.update('collaborationSessions', allSessions);
        } catch (error) {
            console.error(`Error removing persisted session ${sessionId}:`, error);
        }
    }

    /**
     * Dispose of the service and clean up resources
     */
    dispose(): void {
        // Clear all timeouts
        this.sessionTimeouts.forEach(timeout => clearTimeout(timeout));
        this.sessionTimeouts.clear();
        
        // Mark all sessions as inactive
        this.sessions.forEach(session => {
            session.isActive = false;
        });
        
        // Remove all listeners
        this.removeAllListeners();
        
        console.log('CollaborationService disposed');
    }
}
