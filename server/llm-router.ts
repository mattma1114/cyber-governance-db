/**
 * llm-router.ts
 *
 * 统一 LLM 调用入口。优先使用管理员在 api_settings 中配置的外部 LLM 服务，
 * 若未配置或调用失败则自动降级到 Manus 内置 LLM（BUILT_IN_FORGE_API_KEY）。
 *
 * 支持的外部服务商：
 *   openai      – OpenAI API (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)
 *   deepseek    – DeepSeek API (deepseek-chat, deepseek-reasoner)
 *   anthropic   – Anthropic Claude API (claude-3-5-sonnet, claude-3-haiku)
 *   azure       – Azure OpenAI (需要额外的 endpoint 配置)
 *   openai_compat – 任何兼容 OpenAI 格式的自定义端点（如 Ollama、Together.ai 等）
 *
 * 数据库中存储的 key 约定：
 *   LLM_PROVIDER        – 当前启用的服务商 (openai | deepseek | anthropic | azure | openai_compat | builtin)
 *   LLM_API_KEY         – 外部服务商的 API Key
 *   LLM_MODEL           – 使用的模型名称（如 gpt-4o、deepseek-chat）
 *   LLM_BASE_URL        – 自定义端点 URL（仅 azure / openai_compat 需要）
 *   LLM_API_VERSION     – Azure OpenAI API 版本（仅 azure 需要，如 2024-02-01）
 */

import { invokeLLM, type Message } from "./_core/llm";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LlmProvider = "openai" | "deepseek" | "anthropic" | "azure" | "openai_compat" | "builtin";

export interface LlmConfig {
  provider: LlmProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  apiVersion?: string; // Azure only
}

export interface LlmCallOptions {
  messages: Message[];
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
  temperature?: number;
  max_tokens?: number;
}

export interface LlmResponse {
  choices: Array<{
    message: {
      content: string | null;
      role: string;
    };
  }>;
  provider: LlmProvider; // which provider actually served the request
}

// ── Provider-specific default models ─────────────────────────────────────────

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o",
  deepseek: "deepseek-chat",
  anthropic: "claude-3-5-sonnet-20241022",
  azure: "gpt-4o",
  openai_compat: "gpt-4o",
  builtin: "builtin",
};

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
};

// ── OpenAI-compatible call (covers OpenAI, DeepSeek, Azure, openai_compat) ───

async function callOpenAICompat(
  config: LlmConfig,
  options: LlmCallOptions
): Promise<LlmResponse> {
  const { apiKey, model, baseUrl, apiVersion } = config;
  if (!apiKey) throw new Error("API Key 未配置");

  let endpoint: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.provider === "azure") {
    if (!baseUrl) throw new Error("Azure OpenAI 需要配置 Endpoint URL");
    const version = apiVersion ?? "2024-02-01";
    const deploymentName = model ?? "gpt-4o";
    endpoint = `${baseUrl.replace(/\/$/, "")}/openai/deployments/${deploymentName}/chat/completions?api-version=${version}`;
    headers["api-key"] = apiKey;
  } else {
    const base = baseUrl ?? PROVIDER_BASE_URLS[config.provider] ?? "https://api.openai.com/v1";
    endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const body: Record<string, unknown> = {
    model: model ?? DEFAULT_MODELS[config.provider],
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
  };

  if (options.max_tokens) body.max_tokens = options.max_tokens;

  // JSON schema response format (supported by OpenAI, DeepSeek; skip for others)
  if (options.response_format && config.provider !== "azure") {
    body.response_format = options.response_format;
  } else if (options.response_format) {
    // Azure: use json_object mode as fallback
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${config.provider} API 错误 HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string | null; role: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`${config.provider} API 错误: ${data.error.message}`);
  if (!data.choices?.length) throw new Error(`${config.provider} API 返回空结果`);

  return { choices: data.choices, provider: config.provider };
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(
  config: LlmConfig,
  options: LlmCallOptions
): Promise<LlmResponse> {
  const { apiKey, model } = config;
  if (!apiKey) throw new Error("Anthropic API Key 未配置");

  // Convert OpenAI-style messages to Anthropic format
  let systemContent = "";
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of options.messages) {
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    if (msg.role === "system") {
      systemContent += (systemContent ? "\n" : "") + content;
    } else if (msg.role === "user" || msg.role === "assistant") {
      anthropicMessages.push({ role: msg.role, content });
    }
  }

  // If JSON output is requested, append instruction to system prompt
  if (options.response_format) {
    systemContent += "\n\nIMPORTANT: Respond ONLY with valid JSON matching the requested schema. No explanation, no markdown code blocks.";
  }

  const body: Record<string, unknown> = {
    model: model ?? DEFAULT_MODELS.anthropic,
    max_tokens: options.max_tokens ?? 4096,
    messages: anthropicMessages,
  };
  if (systemContent) body.system = systemContent;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API 错误 HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Anthropic API 错误: ${data.error.message}`);
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";

  return {
    choices: [{ message: { content: text, role: "assistant" } }],
    provider: "anthropic",
  };
}

// ── Built-in Manus LLM fallback ───────────────────────────────────────────────

async function callBuiltin(options: LlmCallOptions): Promise<LlmResponse> {
  const result = await invokeLLM({
    messages: options.messages,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });
  return {
    choices: result.choices as Array<{ message: { content: string | null; role: string } }>,
    provider: "builtin",
  };
}

// ── Main router function ──────────────────────────────────────────────────────

/**
 * 统一 LLM 调用入口。
 * @param config  从数据库读取的 LLM 配置（由调用方传入，避免重复查库）
 * @param options 调用参数（messages, response_format 等）
 * @returns LlmResponse（含实际使用的 provider 字段）
 */
export async function routeLlm(
  config: LlmConfig | null,
  options: LlmCallOptions
): Promise<LlmResponse> {
  const provider = config?.provider ?? "builtin";

  // If no external config or explicitly set to builtin, use Manus built-in
  if (!config || provider === "builtin" || !config.apiKey) {
    return callBuiltin(options);
  }

  try {
    switch (provider) {
      case "anthropic":
        return await callAnthropic(config, options);
      case "openai":
      case "deepseek":
      case "azure":
      case "openai_compat":
        return await callOpenAICompat(config, options);
      default:
        return callBuiltin(options);
    }
  } catch (err) {
    // Fallback to built-in on external API failure
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[llm-router] External LLM (${provider}) failed, falling back to built-in: ${msg}`);
    return callBuiltin(options);
  }
}

/**
 * 从 api_settings 行数组中解析 LLM 配置。
 * 约定的 key 名称见文件顶部注释。
 */
export function parseLlmConfig(
  rows: Array<{ key: string; value: string }>
): LlmConfig | null {
  const get = (key: string) => rows.find((r) => r.key === key)?.value ?? "";
  const provider = get("LLM_PROVIDER") as LlmProvider;
  if (!provider || provider === "builtin") return null;

  return {
    provider,
    apiKey: get("LLM_API_KEY") || undefined,
    model: get("LLM_MODEL") || undefined,
    baseUrl: get("LLM_BASE_URL") || undefined,
    apiVersion: get("LLM_API_VERSION") || undefined,
  };
}

// ── Task-level LLM config ──────────────────────────────────────────────────

/**
 * 支持按功能分配 LLM 的任务键定义。
 * 数据库 key 约定：
 *   LLM_TASK_{TASK_KEY}_PROVIDER  – 该任务使用的服务商
 *   LLM_TASK_{TASK_KEY}_MODEL     – 该任务使用的模型
 * API Key 共用全局配置（LLM_API_KEY）。
 */
export const LLM_TASKS = [
  { key: "CASE_EXTRACT",    label: "内容提取 + 法律分析",   desc: "从 URL 自动提取司法内容、摘要、分类、当事方，并生成深度法律分析（同一次调用）" },
  { key: "PLATFORM_FILL",   label: "平台信息填写", desc: "根据关键词自动填写平台基本信息、画像、发展历程" },
  { key: "TAG_SUGGEST",     label: "专题/辖区预填写", desc: "根据中文名称自动生成 slug、英文名称、颜色" },
] as const;

export type LlmTaskKey = typeof LLM_TASKS[number]["key"];

/**
 * 解析指定任务的 LLM 配置。
 * 回退链：任务级配置 → 全局配置 → null（使用内置 LLM）
 */
export function parseLlmConfigForTask(
  rows: Array<{ key: string; value: string }>,
  taskKey: LlmTaskKey
): LlmConfig | null {
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";

  // 1. 尝试任务级配置
  const taskProvider = get(`LLM_TASK_${taskKey}_PROVIDER`) as LlmProvider;
  if (taskProvider) {
    // 任务级明确指定了服务商
    if (taskProvider === "builtin") {
      // 明确选择内置 LLM，不继续回退到全局外部配置
      return null;
    }
    // 任务级可独立配置服务商和模型，但共用全局 API Key 和连接信息
    const taskModel = get(`LLM_TASK_${taskKey}_MODEL`);
    const globalApiKey = get("LLM_API_KEY");
    // 如果任务级服务商与全局相同，共用全局 key；否则尝试任务级独立 key
    const taskApiKey = get(`LLM_TASK_${taskKey}_API_KEY`) || globalApiKey;
    if (taskApiKey) {
      return {
        provider: taskProvider,
        apiKey: taskApiKey,
        model: taskModel || undefined,
        baseUrl: get("LLM_BASE_URL") || undefined,
        apiVersion: get("LLM_API_VERSION") || undefined,
      };
    }
  }

  // 2. 回退到全局配置
  return parseLlmConfig(rows);
}

/**
 * 按任务级路由 LLM 调用的便捷封装函数。
 */
export async function routeLlmForTask(
  rows: Array<{ key: string; value: string }>,
  taskKey: LlmTaskKey,
  options: LlmCallOptions
): Promise<LlmResponse> {
  const config = parseLlmConfigForTask(rows, taskKey);
  return routeLlm(config, options);
}

/**
 * 测试外部 LLM 连通性（直接调用外部 API，不走降级逻辑）。
 * 外部 API 失败时明确返回失败，不会回落到内置 LLM。
 */
export async function testLlmConfig(config: LlmConfig): Promise<{
  ok: boolean;
  latencyMs: number;
  provider: LlmProvider;
  model: string;
  message: string;
}> {
  const start = Date.now();
  const model = config.model ?? DEFAULT_MODELS[config.provider];
  const testOptions: LlmCallOptions = {
    messages: [
      { role: "user", content: 'Reply with exactly: {"ok":true}' },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "health_check",
        strict: true,
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          additionalProperties: false,
        },
      },
    },
    max_tokens: 20,
  };
  try {
    // 直接调用外部 API，不走降级逻辑
    let result: LlmResponse;
    switch (config.provider) {
      case "anthropic":
        result = await callAnthropic(config, testOptions);
        break;
      case "openai":
      case "deepseek":
      case "azure":
      case "openai_compat":
        result = await callOpenAICompat(config, testOptions);
        break;
      default:
        throw new Error(`不支持的服务商: ${config.provider}`);
    }
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      provider: result.provider,
      model,
      message: `连通成功（${latencyMs}ms）`,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      provider: config.provider,
      model,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
