/**
 * Real-time collaboration system for FilteredDetailsListV2
 * Inspired by Google Docs, Figma, and Notion's collaboration features
 */

import * as React from 'react';

interface ICollaborationUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    color: string;
    isOnline: boolean;
    cursor?: {
        row: number;
        column: string;
        timestamp: number;
    };
    selection?: {
        startRow: number;
        endRow: number;
        column?: string;
        timestamp: number;
    };
}

interface ICollaborationEvent {
    id: string;
    userId: string;
    type: 'filter' | 'sort' | 'selection' | 'edit' | 'scroll' | 'cursor';
    data: any;
    timestamp: number;
    version: number;
}

interface IConflictResolution {
    strategy: 'last-write-wins' | 'merge' | 'user-prompt';
    mergeFunction?: (local: any, remote: any) => any;
}

export class CollaborationEngine {
    private users = new Map<string, ICollaborationUser>();
    private currentUser: ICollaborationUser;
    private eventQueue: ICollaborationEvent[] = [];
    private version = 0;
    private websocket: WebSocket | null = null;
    private conflictResolution: IConflictResolution;
    private eventHandlers = new Map<string, Set<(event: ICollaborationEvent) => void>>();
    private presenceHeartbeat: number | null = null;

    constructor(
        currentUser: ICollaborationUser,
        websocketUrl?: string,
        conflictResolution: IConflictResolution = { strategy: 'last-write-wins' },
    ) {
        this.currentUser = currentUser;
        this.conflictResolution = conflictResolution;
        this.initializeWebSocket(websocketUrl);
        this.startPresenceHeartbeat();
    }

    private initializeWebSocket(url?: string) {
        // Skip WebSocket in Canvas Apps to avoid HTTP method errors
        if (!url || typeof window === 'undefined' || window.location?.href?.includes('powerapps.com')) {
            console.log('WebSocket disabled in Canvas Apps environment');
            return;
        }

        try {
            this.websocket = new WebSocket(url);

            this.websocket.onopen = () => {
                console.log('Collaboration WebSocket connected');
                this.sendPresenceUpdate();
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleRemoteEvent(data);
            };

            this.websocket.onclose = () => {
                console.log('Collaboration WebSocket disconnected');
                // Attempt reconnection after delay
                setTimeout(() => this.initializeWebSocket(url), 5000);
            };

            this.websocket.onerror = (error) => {
                console.error('Collaboration WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    private startPresenceHeartbeat() {
        this.presenceHeartbeat = window.setInterval(() => {
            this.sendPresenceUpdate();
        }, 30000) as any; // Every 30 seconds
    }

    private sendPresenceUpdate() {
        const presenceEvent: ICollaborationEvent = {
            id: this.generateEventId(),
            userId: this.currentUser.id,
            type: 'cursor',
            data: {
                user: this.currentUser,
                isOnline: true,
            },
            timestamp: Date.now(),
            version: this.version,
        };

        this.broadcastEvent(presenceEvent);
    }

    private handleRemoteEvent(event: ICollaborationEvent) {
        // Handle version conflicts
        if (event.version < this.version) {
            // Older event, handle conflict resolution
            this.resolveConflict(event);
        } else {
            // Apply event
            this.applyEvent(event);
            this.version = Math.max(this.version, event.version) + 1;
        }

        // Update user presence
        this.updateUserPresence(event);

        // Emit to registered handlers
        this.emitEvent(event);
    }

    private resolveConflict(event: ICollaborationEvent) {
        switch (this.conflictResolution.strategy) {
            case 'last-write-wins':
                // Ignore older events
                break;
            case 'merge':
                if (this.conflictResolution.mergeFunction) {
                    const localState = this.getCurrentState(event.type);
                    const mergedState = this.conflictResolution.mergeFunction(localState, event.data);
                    this.applyMergedState(event.type, mergedState);
                }
                break;
            case 'user-prompt':
                this.promptUserForConflictResolution(event);
                break;
        }
    }

    private getCurrentState(eventType: string): any {
        // Get current state based on event type
        switch (eventType) {
            case 'filter':
                return this.getCurrentFilters();
            case 'sort':
                return this.getCurrentSorting();
            case 'selection':
                return this.getCurrentSelection();
            default:
                return null;
        }
    }

    private applyEvent(event: ICollaborationEvent) {
        switch (event.type) {
            case 'filter':
                this.applyRemoteFilter(event.data);
                break;
            case 'sort':
                this.applyRemoteSort(event.data);
                break;
            case 'selection':
                this.applyRemoteSelection(event.data);
                break;
            case 'cursor':
                this.updateUserCursor(event.userId, event.data);
                break;
            case 'scroll':
                this.handleRemoteScroll(event.data);
                break;
        }
    }

    private updateUserPresence(event: ICollaborationEvent) {
        if (event.type === 'cursor' && event.data.user) {
            this.users.set(event.userId, {
                ...event.data.user,
                isOnline: true,
            });
        }
    }

    private emitEvent(event: ICollaborationEvent) {
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
            handlers.forEach((handler) => handler(event));
        }
    }

    // Public API Methods

    public broadcastFilter(filters: any) {
        const event: ICollaborationEvent = {
            id: this.generateEventId(),
            userId: this.currentUser.id,
            type: 'filter',
            data: { filters, user: this.currentUser },
            timestamp: Date.now(),
            version: ++this.version,
        };

        this.broadcastEvent(event);
    }

    public broadcastSort(sorting: any) {
        const event: ICollaborationEvent = {
            id: this.generateEventId(),
            userId: this.currentUser.id,
            type: 'sort',
            data: { sorting, user: this.currentUser },
            timestamp: Date.now(),
            version: ++this.version,
        };

        this.broadcastEvent(event);
    }

    public broadcastSelection(selection: any) {
        const event: ICollaborationEvent = {
            id: this.generateEventId(),
            userId: this.currentUser.id,
            type: 'selection',
            data: { selection, user: this.currentUser },
            timestamp: Date.now(),
            version: ++this.version,
        };

        this.broadcastEvent(event);
    }

    public broadcastCursor(row: number, column: string) {
        this.currentUser.cursor = { row, column, timestamp: Date.now() };

        const event: ICollaborationEvent = {
            id: this.generateEventId(),
            userId: this.currentUser.id,
            type: 'cursor',
            data: { cursor: this.currentUser.cursor, user: this.currentUser },
            timestamp: Date.now(),
            version: ++this.version,
        };

        this.broadcastEvent(event);
    }

    public onEvent(eventType: string, handler: (event: ICollaborationEvent) => void) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.eventHandlers.get(eventType)?.delete(handler);
        };
    }

    public getOnlineUsers(): ICollaborationUser[] {
        return Array.from(this.users.values()).filter((user) => user.isOnline);
    }

    public getUserPresence(userId: string): ICollaborationUser | null {
        return this.users.get(userId) || null;
    }

    private broadcastEvent(event: ICollaborationEvent) {
        this.eventQueue.push(event);

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(event));
        }
    }

    private generateEventId(): string {
        return `${this.currentUser.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Placeholder methods for actual implementation
    private applyRemoteFilter(data: any) {
        console.log('Applying remote filter:', data);
        // Implementation depends on your filter system
    }

    private applyRemoteSort(data: any) {
        console.log('Applying remote sort:', data);
        // Implementation depends on your sort system
    }

    private applyRemoteSelection(data: any) {
        console.log('Applying remote selection:', data);
        // Implementation depends on your selection system
    }

    private updateUserCursor(userId: string, data: any) {
        const user = this.users.get(userId);
        if (user && data.cursor) {
            user.cursor = data.cursor;
            this.users.set(userId, user);
        }
    }

    private handleRemoteScroll(data: any) {
        console.log('Handling remote scroll:', data);
        // Implementation for scroll synchronization
    }

    private getCurrentFilters(): any {
        // Return current filter state
        return {};
    }

    private getCurrentSorting(): any {
        // Return current sort state
        return {};
    }

    private getCurrentSelection(): any {
        // Return current selection state
        return {};
    }

    private applyMergedState(eventType: string, mergedState: any) {
        console.log('Applying merged state:', eventType, mergedState);
        // Apply the merged state to the component
    }

    private promptUserForConflictResolution(event: ICollaborationEvent) {
        console.log('Conflict detected, prompting user:', event);
        // Show UI for conflict resolution
    }

    public destroy() {
        if (this.presenceHeartbeat) {
            clearInterval(this.presenceHeartbeat);
        }

        if (this.websocket) {
            this.websocket.close();
        }

        this.eventHandlers.clear();
        this.users.clear();
    }
}

// React hook for collaboration features
export const useCollaboration = (currentUser: ICollaborationUser, websocketUrl?: string) => {
    const [engine] = React.useState(() => new CollaborationEngine(currentUser, websocketUrl));
    const [onlineUsers, setOnlineUsers] = React.useState<ICollaborationUser[]>([]);
    const [userCursors, setUserCursors] = React.useState<Map<string, any>>(new Map());

    React.useEffect(() => {
        // Subscribe to cursor events
        const unsubscribeCursor = engine.onEvent('cursor', (event) => {
            if (event.data.cursor) {
                setUserCursors((prev) => new Map(prev.set(event.userId, event.data.cursor)));
            }
        });

        // Update online users periodically
        const updateUsers = setInterval(() => {
            setOnlineUsers(engine.getOnlineUsers());
        }, 5000);

        return () => {
            unsubscribeCursor();
            clearInterval(updateUsers);
        };
    }, [engine]);

    React.useEffect(() => {
        return () => {
            engine.destroy();
        };
    }, [engine]);

    return {
        engine,
        onlineUsers,
        userCursors,
        broadcastFilter: engine.broadcastFilter.bind(engine),
        broadcastSort: engine.broadcastSort.bind(engine),
        broadcastSelection: engine.broadcastSelection.bind(engine),
        broadcastCursor: engine.broadcastCursor.bind(engine),
        onEvent: engine.onEvent.bind(engine),
    };
};

// Collaboration UI components
export const UserPresenceIndicator: React.FC<{
    users: ICollaborationUser[];
    maxVisible?: number;
}> = ({ users, maxVisible = 5 }) => {
    const visibleUsers = users.slice(0, maxVisible);
    const hiddenCount = Math.max(0, users.length - maxVisible);

    return (
        <div className="user-presence-indicator">
            {visibleUsers.map((user) => (
                <div
                    key={user.id}
                    className="user-avatar"
                    style={{ borderColor: user.color }}
                    title={`${user.name} (${user.isOnline ? 'online' : 'offline'})`}
                >
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                    ) : (
                        <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                    {user.isOnline && <div className="online-indicator" />}
                </div>
            ))}
            {hiddenCount > 0 && <div className="hidden-users-count">+{hiddenCount}</div>}
        </div>
    );
};

export const UserCursorOverlay: React.FC<{
    cursors: Map<string, any>;
    users: Map<string, ICollaborationUser>;
}> = ({ cursors, users }) => {
    return (
        <div className="user-cursor-overlay">
            {Array.from(cursors.entries()).map(([userId, cursor]) => {
                const user = users.get(userId);
                if (!user || !cursor) return null;

                return (
                    <div
                        key={userId}
                        className="user-cursor"
                        style={{
                            position: 'absolute',
                            left: cursor.x,
                            top: cursor.y,
                            borderColor: user.color,
                            pointerEvents: 'none',
                        }}
                    >
                        <div className="cursor-label" style={{ backgroundColor: user.color }}>
                            {user.name}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
