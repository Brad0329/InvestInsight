import { storage } from '../utils/storage';

const AI_CONFIGS = {
  claude: {
    label: 'Claude Sonnet 4.6',
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
    keyName: 'investinsight_claude_key',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, systemPrompt) => ({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
    parseResponse: (data) => data.content?.[0]?.text || '',
  },
  gpt4o: {
    label: 'GPT-4o',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    keyName: 'investinsight_gpt_key',
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, systemPrompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || '',
  },
  deepseek: {
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-reasoner',
    keyName: 'investinsight_deepseek_key',
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, systemPrompt) => ({
      model: 'deepseek-reasoner',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || '',
  },
  gemini: {
    label: 'Gemini 2.0 Flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    keyName: 'investinsight_gemini_key',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, systemPrompt) => ({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }),
    parseResponse: (data) =>
      data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    buildUrl: (apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  },
};

export function getAvailableModels() {
  return Object.entries(AI_CONFIGS).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    model: cfg.model,
    hasKey: !!storage.get(cfg.keyName),
  }));
}

export async function sendMessage(modelId, messages, systemPrompt) {
  const config = AI_CONFIGS[modelId];
  if (!config) throw new Error(`Unknown AI model: ${modelId}`);

  const apiKey = storage.get(config.keyName);
  if (!apiKey) throw new Error(`API key not set for ${modelId}`);

  const url = config.buildUrl ? config.buildUrl(apiKey) : config.url;
  const headers = config.buildHeaders(apiKey);
  const body = config.buildBody(messages, systemPrompt);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      // Claude: { error: { message: "..." } }
      // OpenAI: { error: { message: "..." } }
      errMsg = errData.error?.message || JSON.stringify(errData);
    } catch {
      errMsg = (await res.text()) || errMsg;
    }
    throw new Error(`[${config.label}] ${errMsg}`);
  }

  const data = await res.json();
  return config.parseResponse(data);
}
