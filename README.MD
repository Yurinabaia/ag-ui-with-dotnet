# Agent Framework — AG-UI com .NET 8 e Angular

> 📖 Este projeto é o repositório de referência do artigo publicado no Medium:
> **[Como integrar o protocolo AG-UI com backend .NET e frontend Angular](https://medium.com/@yurinabaia/como-integrar-o-protocolo-ag-ui-com-backend-net-e-frontend-angular-519cf6437e03)**

---

## O que é o AG-UI?

O **AG-UI** é um protocolo aberto baseado em **Server-Sent Events (SSE)** que padroniza a comunicação entre agentes de IA e interfaces de usuário.

Em vez de cada time criar sua própria lógica de streaming, o AG-UI define um contrato comum de eventos tipados — como `TextMessageStart`, `TextMessageContent` e `ToolCallStart` — garantindo que qualquer frontend compatível converse com qualquer backend, independentemente da linguagem.

| Vantagem | Descrição |
|---|---|
| **Streaming Nativo** | Sem a complexidade de WebSockets |
| **Interoperável** | Backend em .NET, frontend em Angular (ou React/Vue) |
| **Pronto para o Futuro** | Suporte nativo a estados e ferramentas (tool calls) |

---

## Arquitetura

```
┌─────────────────────────────┐        SSE / AG-UI Protocol       ┌──────────────────────────────┐
│   Frontend (Angular 19)      │  ──────────────────────────────►  │   Backend (.NET 8)            │
│                              │                                    │                              │
│  ChatComponent               │   POST /agent                      │  MapAGUI("/agent", agent)    │
│    └─ signals (state)        │ ◄──────────────────────────────── │                              │
│  ChatService                 │   TextMessageContent events        │  AIAgent (OpenAI / proxy)    │
│    └─ @ag-ui/client          │                                    │  Microsoft.Agents.AI         │
└─────────────────────────────┘                                    └──────────────────────────────┘
```

---

## Pré-requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [Angular CLI 19+](https://angular.dev/) (`npm install -g @angular/cli`)
- Uma chave de API OpenAI (ou endpoint proxy compatível)

---

## Estrutura do Projeto

```
Agent-Framework/
├── Program.cs                        # Ponto de entrada do backend .NET
├── appsettings.json                  # Configurações (API Key, URL, Deployment)
└── AGUIAngular/
    └── aguitest/                     # Projeto Angular
        └── src/app/
            ├── chat/
            │   ├── chat.component.ts # Lógica com Angular Signals
            │   ├── chat.component.html
            │   └── chat.component.css
            └── services/
                └── chat.service.ts   # Cliente AG-UI (HttpAgent + RxJS)
```

---

## Parte 1 — Backend (.NET 8)

### Pacotes NuGet utilizados

```bash
dotnet add package Microsoft.Agents.AI --version 1.0.0-rc5
dotnet add package Microsoft.Agents.AI.Hosting.AGUI.AspNetCore --version 1.0.0-preview.260330.1
dotnet add package Microsoft.Extensions.AI.OpenAI --version 9.5.0-preview.1.25265.7
```

### Configuração (`appsettings.json`)

> ⚠️ O repositório não inclui os arquivos de configuração com credenciais. Antes de rodar o projeto, renomeie os arquivos de template:
> - `appsettings copy.json` → `appsettings.json`
> - `appsettings.Development copy.json` → `appsettings.Development.json`

Edite o `appsettings.json` com suas credenciais:

```json
{
  "OPENAI_BASE_URL": "https://api.openai.com/v1",
  "OPENAI_API_KEY": "SUA_CHAVE_AQUI",
  "OPENAI_DEPLOYMENT_NAME": "gpt-4o-mini"
}
```

> 💡 `OPENAI_BASE_URL` padrão da OpenAI é `https://api.openai.com/v1`. Se estiver usando um proxy ou Azure OpenAI, substitua pela URL correspondente.

### `Program.cs` — O coração do agente

```csharp
builder.Services.AddAGUI();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// ...

AIAgent agent = chatClient.AsIChatClient().AsAIAgent(
    name: "AGUIAssistant",
    instructions: "You are a helpful assistant.");

app.MapAGUI("/agent", agent);
```

> 💡 O método `MapAGUI` elimina a necessidade de criar controllers manuais para gerenciar o streaming SSE. Ele cuida de todo o ciclo de vida da conversa.

### Executando o backend

```bash
dotnet run
# Disponível em: http://localhost:5172
```

---

## Parte 2 — Frontend (Angular 19 + Signals)

### Instalando o SDK do AG-UI

```bash
cd AGUIAngular/aguitest
npm install
```

O pacote `@ag-ui/client` já está declarado no `package.json`.

### `ChatService` — Consumindo o stream SSE

```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private agent = new HttpAgent({ url: 'http://localhost:5172/agent' });

  runAgent(messages: Message[]): Observable<BaseEvent> {
    return this.agent.run({
      threadId: randomUUID(),
      runId: randomUUID(),
      messages,
    });
  }
}
```

### `ChatComponent` — Estado com Signals

```typescript
messages = signal<ChatMessage[]>([]);
isLoading = signal(false);

this.chatService.runAgent(agMessages).subscribe({
  next: (event) => {
    if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
      const e = event as TextMessageContentEvent;
      this.messages.update(msgs =>
        msgs.map(m => m.id === assistantId
          ? { ...m, content: m.content + e.delta }
          : m)
      );
    }
  },
  complete: () => this.isLoading.set(false),
});
```

### Template com Angular Control Flow

```html
@for (msg of messages(); track msg.id) {
  <div class="bubble" [class.user]="msg.role === 'user'">
    {{ msg.content }}
    @if (msg.isStreaming) { <span class="cursor">|</span> }
  </div>
}
```

### Executando o frontend

```bash
cd AGUIAngular/aguitest
ng serve
# Disponível em: http://localhost:4200
```

---

## Por que essa stack é poderosa?

| Característica | Benefício |
|---|---|
| **Abstração de Protocolo** | Você não parseia chunks de texto manualmente; o `@ag-ui/client` entrega eventos tipados |
| **Desacoplamento** | Se você trocar .NET por Python no backend, o frontend Angular continua sem alterações |
| **Signals no Angular** | Garante que apenas a bolha de mensagem em streaming seja re-renderizada |

---

## Recursos Adicionais

- 📦 [Microsoft.Agents.AI (NuGet)](https://www.nuget.org/packages/Microsoft.Agents.AI)
- 🌐 [Especificação AG-UI](https://docs.ag-ui.com/)
- 📖 [Artigo completo no Medium](https://medium.com/@yurinabaia/como-integrar-o-protocolo-ag-ui-com-backend-net-e-frontend-angular-519cf6437e03)
