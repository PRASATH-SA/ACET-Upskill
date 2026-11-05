import { openStream, readLines, requestJson } from '../http.js';

/**
 * Ollama native API (A.7.2): /api/chat with `format` = JSON schema for structured output,
 * /api/embed for embeddings, /api/tags for pulled models.
 * @implements {import('./types.js').LLMProvider}
 */
export class OllamaProvider {
  constructor({ baseUrl, fetchImpl = fetch }) {
    this.name = 'ollama';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetch = fetchImpl;
  }

  async chat({ model, messages, schema, temperature, maxTokens, signal }) {
    const body = {
      model,
      messages,
      stream: false,
      ...(schema ? { format: schema } : {}),
      options: {
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxTokens ? { num_predict: maxTokens } : {}),
      },
    };
    const data = await requestJson(this.fetch, `${this.baseUrl}/api/chat`, { body, signal });
    return {
      content: data.message?.content ?? '',
      model: data.model ?? model,
      usage: { promptTokens: data.prompt_eval_count, completionTokens: data.eval_count },
    };
  }

  /** Streams text tokens. The final yielded value carries `{ done: true, usage }`. */
  async *chatStream({ model, messages, temperature, maxTokens, signal }) {
    const res = await openStream(this.fetch, `${this.baseUrl}/api/chat`, {
      signal,
      body: {
        model,
        messages,
        stream: true,
        options: {
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens ? { num_predict: maxTokens } : {}),
        },
      },
    });
    for await (const line of readLines(res)) {
      const chunk = JSON.parse(line);
      if (chunk.message?.content) yield { token: chunk.message.content };
      if (chunk.done) {
        yield {
          done: true,
          usage: { promptTokens: chunk.prompt_eval_count, completionTokens: chunk.eval_count },
        };
      }
    }
  }

  async embed({ model, texts, signal }) {
    const data = await requestJson(this.fetch, `${this.baseUrl}/api/embed`, {
      body: { model, input: texts },
      signal,
    });
    return { embeddings: data.embeddings, model: data.model ?? model };
  }

  async listModels({ signal } = {}) {
    const data = await requestJson(this.fetch, `${this.baseUrl}/api/tags`, {
      method: 'GET',
      signal,
    });
    return (data.models ?? []).map((m) => m.name);
  }
}
