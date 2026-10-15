import { openStream, readLines, requestJson } from '../http.js';

/**
 * Any OpenAI-compatible local server (LM Studio, llama.cpp server, vLLM) (A.7.2):
 * /v1/chat/completions with response_format json_schema, /v1/embeddings, /v1/models.
 * LLM_BASE_URL may be given with or without the /v1 suffix.
 * @implements {import('./types.js').LLMProvider}
 */
export class OpenAICompatibleProvider {
  constructor({ baseUrl, apiKey, fetchImpl = fetch }) {
    this.name = 'openai-compatible';
    const trimmed = baseUrl.replace(/\/+$/, '');
    this.baseUrl = trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
    this.headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    this.fetch = fetchImpl;
  }

  async chat({ model, messages, schema, schemaName = 'output', temperature, maxTokens, signal }) {
    const body = {
      model,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(schema
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: schemaName.replace(/[^A-Za-z0-9_-]/g, '_'),
                schema,
                strict: true,
              },
            },
          }
        : {}),
    };
    const data = await requestJson(this.fetch, `${this.baseUrl}/chat/completions`, {
      body,
      signal,
      headers: this.headers,
    });
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  }

  async *chatStream({ model, messages, temperature, maxTokens, signal }) {
    const res = await openStream(this.fetch, `${this.baseUrl}/chat/completions`, {
      signal,
      headers: this.headers,
      body: {
        model,
        messages,
        stream: true,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      },
    });
    let usage;
    for await (const line of readLines(res)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') break;
      const chunk = JSON.parse(payload);
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) yield { token };
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
        };
      }
    }
    yield { done: true, usage };
  }

  async embed({ model, texts, signal }) {
    const data = await requestJson(this.fetch, `${this.baseUrl}/embeddings`, {
      body: { model, input: texts },
      signal,
      headers: this.headers,
    });
    const rows = [...(data.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return { embeddings: rows.map((r) => r.embedding), model: data.model ?? model };
  }

  async listModels({ signal } = {}) {
    const data = await requestJson(this.fetch, `${this.baseUrl}/models`, {
      method: 'GET',
      signal,
      headers: this.headers,
    });
    return (data.data ?? []).map((m) => m.id);
  }
}
