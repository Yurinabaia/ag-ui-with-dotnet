import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventType, Message, TextMessageContentEvent } from '@ag-ui/core';
import { randomUUID } from '@ag-ui/client';
import { ChatService } from '../services/chat.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  hasError?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private chatService = inject(ChatService);
  private messagesEndRef = viewChild<ElementRef>('messagesEnd');

  messages = signal<ChatMessage[]>([]);
  inputText = signal('');
  isLoading = signal(false);

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: text,
    };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.inputText.set('');
    this.isLoading.set(true);

    const assistantId = randomUUID();
    this.messages.update((msgs) => [
      ...msgs,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);

    const agMessages: Message[] = this.messages()
      .filter((m) => m.id !== assistantId)
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    this.chatService.runAgent(agMessages).subscribe({
      next: (event) => {
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          const e = event as TextMessageContentEvent;
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + e.delta }
                : m,
            ),
          );
          this.scrollToBottom();
        }
      },
      error: (err) => {
        console.error('[AG-UI] Error:', err);
        this.messages.update((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: '⚠️ Erro ao conectar com o agente. Tente novamente.',
                  isStreaming: false,
                  hasError: true,
                }
              : m,
          ),
        );
        this.isLoading.set(false);
      },
      complete: () => {
        this.messages.update((msgs) =>
          msgs.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
        this.isLoading.set(false);
        this.scrollToBottom();
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    if (this.isLoading()) return;
    this.messages.set([]);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesEndRef();
      if (el) {
        el.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  }
}
