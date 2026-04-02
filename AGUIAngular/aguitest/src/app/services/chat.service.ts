import { Injectable } from '@angular/core';
import { HttpAgent, randomUUID } from '@ag-ui/client';
import { BaseEvent, Message, RunAgentInput } from '@ag-ui/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly agentUrl = 'http://localhost:5172/agent';
  private readonly threadId = randomUUID();

  private agent = new HttpAgent({
    url: this.agentUrl,
  });

  runAgent(messages: Message[]): Observable<BaseEvent> {
    const input: RunAgentInput = {
      threadId: this.threadId,
      runId: randomUUID(),
      messages,
      tools: [],
      context: [],
      state: null,
    };
    return this.agent.run(input);
  }
}
