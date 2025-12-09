/**
 * Hybrid Conversation Service
 * 
 * Implements a robust conversation management system following best practices:
 * 1. Memory-first for immediate UI feedback
 * 2. Database persistence for reliability
 * 3. Graceful fallback if database is unavailable
 * 4. Real-time conversation state management
 */

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_active: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  query?: string;
  answer?: string;
  role: 'user' | 'assistant';
  created_at: string;
  metadata?: any;
}

export interface ConversationState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

class ConversationService {
  private memoryConversations: Map<string, Conversation> = new Map();
  private memoryMessages: Map<string, Message[]> = new Map();
  private currentConversationId: string | null = null;
  private backendUrl: string;

  constructor() {
    // In browser contexts prefer same-origin proxy so that HttpOnly cookies and CORS
    // issues are avoided. For server-side or build-time use NEXT_PUBLIC_BACKEND_URL.
    if (typeof window !== 'undefined') {
      this.backendUrl = '/api';
    } else {
      this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
    }
  }

  private async apiFetch(path: string, init?: RequestInit) {
    // In browser use same-origin proxy with fetchApi helper to ensure auth init
    if (typeof window !== 'undefined') {
      // lazy require to avoid circular deps during build
      try {
        // Use dynamic import to satisfy ESLint and avoid require() style import
        const mod = await import('@/utils/api');
        const fetchApi = (mod as any).fetchApi || (mod as any).default?.fetchApi;
        if (typeof fetchApi === 'function') {
          return await fetchApi(path.replace(/^\/+/, ''), init || {});
        }
        // fallback to window.fetch
        return await fetch(path, { ...(init || {}), credentials: 'include' });
      } catch (e) {
        // fallback to window fetch
        return await fetch(path, { ...(init || {}), credentials: 'include' });
      }
    }
    // server-side or node: call backendUrl directly
    const full = `${this.backendUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
    return await fetch(full, init);
  }

  // ===== Memory-First Operations =====

  /**
   * Create a new conversation in memory immediately
   */
  createConversation(title: string): Conversation {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const conversation: Conversation = {
      id,
      title,
      created_at: now,
      updated_at: now,
      message_count: 0,
      is_active: true
    };

    this.memoryConversations.set(id, conversation);
    this.memoryMessages.set(id, []);
    this.currentConversationId = id;

    // Try to persist to database (non-blocking)
    this.persistConversation(conversation).catch(console.error);

    return conversation;
  }

  /**
   * Add message to current conversation in memory
   */
  addMessage(content: string, role: 'user' | 'assistant', metadata?: any): Message {
    // Create a conversation if none exists
    if (!this.currentConversationId) {
      this.createConversation(`Chat ${new Date().toLocaleString()}`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const message: Message = {
      id,
      conversation_id: this.currentConversationId!,
      query: role === 'user' ? content : undefined,
      answer: role === 'assistant' ? content : undefined,
      role,
      created_at: now,
      metadata
    };

    const messages = this.memoryMessages.get(this.currentConversationId!) || [];
    messages.push(message);
    this.memoryMessages.set(this.currentConversationId!, messages);

    // Update conversation metadata
    const conversation = this.currentConversationId ? this.memoryConversations.get(this.currentConversationId) : null;
    if (conversation) {
      conversation.message_count = messages.length;
      conversation.updated_at = now;
    }

    // Try to persist to database (non-blocking)
    this.persistMessage(message).catch(console.error);

    return message;
  }

  /**
   * Get current conversation messages from memory
   */
  getCurrentConversationMessages(): Message[] {
    if (!this.currentConversationId) return [];
    return this.memoryMessages.get(this.currentConversationId) || [];
  }

  /**
   * Get current conversation from memory
   */
  getCurrentConversation(): Conversation | null {
    if (!this.currentConversationId) return null;
    return this.memoryConversations.get(this.currentConversationId) || null;
  }

  // ===== Database Persistence =====

  /**
   * Persist conversation to database (non-blocking)
   */
  private async persistConversation(conversation: Conversation): Promise<void> {
    try {
      const response = await this.apiFetch('conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversation.id,
          title: conversation.title,
          json_metadata: JSON.stringify({
            message_count: conversation.message_count,
            created_at: conversation.created_at
          })
        })
      });

      if (!response.ok) {
        console.warn('Failed to persist conversation to database:', response.statusText);
      }
    } catch (error) {
      console.warn('Database persistence failed for conversation:', error);
    }
  }

  /**
   * Persist message to database (non-blocking)
   */
  private async persistMessage(message: Message): Promise<void> {
    try {
      const conversationId = message.conversation_id;
      const response = await this.apiFetch(`conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.query || message.answer,
          role: message.role,
          metadata: message.metadata
        })
      });

      if (!response.ok) {
        console.warn('Failed to persist message to database:', response.statusText);
      }
    } catch (error) {
      console.warn('Database persistence failed for message:', error);
    }
  }

  // ===== Database Loading =====

  /**
   * Load conversations from database (with memory fallback)
   */
  async loadConversations(): Promise<Conversation[]> {
    try {
      const response = await this.apiFetch('conversations');
      if (response.ok) {
        const conversations = await response.json();
        // Update memory with database data
        conversations.forEach((conv: any) => {
          this.memoryConversations.set(conv.id, conv);
        });
        return conversations;
      }
    } catch (error) {
      console.warn('Failed to load conversations from database:', error);
    }

    // Fallback to memory
    return Array.from(this.memoryConversations.values());
  }

  /**
   * Load conversation messages from database (with memory fallback)
   */
  async loadConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await this.apiFetch(`conversations/${conversationId}`);
      if (response.ok) {
        const conversation = await response.json();
        if (conversation.messages) {
          // Update memory with database data
          this.memoryMessages.set(conversationId, conversation.messages);
          return conversation.messages;
        }
      }
    } catch (error) {
      console.warn('Failed to load conversation messages from database:', error);
    }

    // Fallback to memory
    return this.memoryMessages.get(conversationId) || [];
  }

  // ===== State Management =====

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return {
      conversations: Array.from(this.memoryConversations.values()),
      currentConversation: this.getCurrentConversation(),
      messages: this.getCurrentConversationMessages(),
      isLoading: false,
      error: null
    };
  }

  /**
   * Set current conversation
   */
  setCurrentConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
  }

  /**
   * Clear current conversation
   */
  clearCurrentConversation(): void {
    this.currentConversationId = null;
  }

  // ===== Utility Methods =====

  /**
   * Check if database is available
   */
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      const response = await this.apiFetch('health');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get conversation by ID
   */
  getConversation(id: string): Conversation | undefined {
    return this.memoryConversations.get(id);
  }

  /**
   * Get messages by conversation ID
   */
  getMessages(conversationId: string): Message[] {
    return this.memoryMessages.get(conversationId) || [];
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
export default conversationService;
