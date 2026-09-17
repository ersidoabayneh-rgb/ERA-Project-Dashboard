import { normalizeProject } from './apiSync';

type RealtimeEventType =
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'USERS_UPDATED'
  | 'APPROVALS_UPDATED'
  | 'CONFIG_UPDATED'
  | 'PRESENCE_UPDATE';

export interface RealtimeMessage {
  type: RealtimeEventType;
  payload: any;
  timestamp: string;
}

type RealtimeListener = (message: RealtimeMessage) => void;

class RealtimeClientManager {
  private socket: WebSocket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isConnecting = false;
  private reconnectInterval = 3000;
  private connectedUsersCount = 1;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('⚡ [Real-time WS]: Connected to MySQL Real-time Synchronization Server');
        // Announce presence
        this.send('JOIN', { clientTime: new Date().toISOString() });
      };

      this.socket.onmessage = (event) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (err) {
          console.warn('[Real-time WS]: Received malformed event:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        console.warn('⚡ [Real-time WS]: Disconnected. Reconnecting in 3s...');
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        this.isConnecting = false;
        console.warn('⚡ [Real-time WS Error]: Socket error encountered');
      };
    } catch (e) {
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  private handleIncomingMessage(msg: RealtimeMessage): void {
    if (msg.type === 'PRESENCE_UPDATE') {
      if (typeof msg.payload?.activeUsers === 'number') {
        this.connectedUsersCount = msg.payload.activeUsers;
      }
    }

    // Handle incoming data synchronization
    if (msg.type === 'PROJECT_UPDATED' && msg.payload) {
      try {
        const normalized = normalizeProject(msg.payload);
        const existingStr = localStorage.getItem('era_proj_v28') || '[]';
        let projects: any[] = JSON.parse(existingStr);
        if (!Array.isArray(projects)) projects = [];

        const idx = projects.findIndex((p: any) => p.id === normalized.id);
        if (idx >= 0) {
          projects[idx] = normalized;
        } else {
          projects.push(normalized);
        }
        localStorage.setItem('era_proj_v28', JSON.stringify(projects));

        // Dispatch window event for React component reactivity
        window.dispatchEvent(new CustomEvent('realtime_project_updated', { detail: normalized }));
        window.dispatchEvent(new CustomEvent('local_project_mutated'));
      } catch (err) {}
    } else if (msg.type === 'PROJECT_DELETED' && msg.payload?.id) {
      try {
        const { id, projectName } = msg.payload;
        const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
        const deletedIds: string[] = JSON.parse(deletedStr);
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
        }

        const projStr = localStorage.getItem('era_proj_v28');
        if (projStr) {
          const projs: any[] = JSON.parse(projStr);
          if (Array.isArray(projs)) {
            const filtered = projs.filter((p: any) => p.id !== id);
            localStorage.setItem('era_proj_v28', JSON.stringify(filtered));
          }
        }

        window.dispatchEvent(new CustomEvent('project_globally_deleted', { detail: { id, projectName } }));
        window.dispatchEvent(new CustomEvent('local_project_mutated'));
      } catch (err) {}
    } else if (msg.type === 'USERS_UPDATED' && msg.payload) {
      try {
        const userList = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
        const usersStr = localStorage.getItem('era_users_v28') || '[]';
        let currentUsers: any[] = JSON.parse(usersStr);
        if (!Array.isArray(currentUsers)) currentUsers = [];

        userList.forEach((u: any) => {
          if (!u || !u.username) return;
          const idx = currentUsers.findIndex((x: any) => x.username.toLowerCase() === u.username.toLowerCase());
          if (idx >= 0) currentUsers[idx] = u;
          else currentUsers.push(u);
        });

        localStorage.setItem('era_users_v28', JSON.stringify(currentUsers));
        window.dispatchEvent(new CustomEvent('realtime_users_updated', { detail: currentUsers }));
      } catch (err) {}
    } else if (msg.type === 'APPROVALS_UPDATED' && msg.payload) {
      try {
        localStorage.setItem('era_appr_v28', JSON.stringify(msg.payload));
        window.dispatchEvent(new CustomEvent('realtime_approvals_updated', { detail: msg.payload }));
      } catch (err) {}
    } else if (msg.type === 'CONFIG_UPDATED' && msg.payload) {
      try {
        if (msg.payload.taxonomy) {
          const { pmos, directorates } = msg.payload.taxonomy;
          if (pmos) localStorage.setItem('era_pmo_taxonomy', JSON.stringify(pmos));
          if (directorates) localStorage.setItem('era_directorates_taxonomy', JSON.stringify(directorates));
        }
        if (msg.payload.scoring_weights) {
          const { contractorWeights, consultantWeights } = msg.payload.scoring_weights;
          if (contractorWeights) localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(contractorWeights));
          if (consultantWeights) localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(consultantWeights));
        }
        window.dispatchEvent(new CustomEvent('realtime_config_updated', { detail: msg.payload }));
      } catch (err) {}
    }

    // Notify registered listeners
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (e) {}
    });
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsersCount;
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const realtimeManager = new RealtimeClientManager();
