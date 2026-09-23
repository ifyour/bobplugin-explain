import * as Bob from '@bob-plug/core';

export function supportLanguages(): Bob.supportLanguages {
  // LLM 解释不依赖具体语种，仅保留 Bob 要求的语言列表
  return ['auto', 'zh-Hans', 'zh-Hant', 'en', 'ja', 'ko', 'fr', 'de', 'ru', 'es'];
}

interface ApiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  apiType: string;
}

function getConfig(): ApiConfig {
  return {
    apiUrl: String(Bob.api.getOption('apiUrl') || 'https://api.openai.com/v1/chat/completions'),
    apiKey: String(Bob.api.getOption('apiKey') || ''),
    model: String(Bob.api.getOption('model') || 'gpt-4o-mini'),
    apiType: String(Bob.api.getOption('apiType') || 'openai'),
  };
}

function buildHeaders(cfg: ApiConfig): Record<string, string> {
  const header: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiType === 'anthropic') {
    if (cfg.apiKey) header['x-api-key'] = cfg.apiKey;
    header['anthropic-version'] = '2023-06-01';
  } else if (cfg.apiKey) {
    header.Authorization = `Bearer ${cfg.apiKey}`;
  }
  return header;
}

// ponytail: Bob $http 拿不到增量 chunk，只能整包接收后解析，无打字机效果；
// 但对"仅支持流式"的服务可用。若 Bob 未来支持流式回调再升级。
function extractText(cfg: ApiConfig, data: any): string {
  // data 可能已是对象(Bob 按 content-type 自动解析)或 SSE/JSON 字符串
  let payload = data;
  if (Bob.util.isString(payload)) {
    const trimmed = payload.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('event:')) {
      // SSE 流: 逐行取 data:, 拼 delta 文本
      let text = '';
      for (const line of trimmed.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const chunkStr = line.slice(5).trim();
        if (!chunkStr || chunkStr === '[DONE]') continue;
        try {
          const chunk = JSON.parse(chunkStr);
          if (cfg.apiType === 'anthropic') {
            if (chunk?.type === 'content_block_delta' && chunk?.delta?.text) text += chunk.delta.text;
          } else if (chunk?.choices?.[0]?.delta?.content) {
            text += String(chunk.choices[0].delta.content);
          }
        } catch (e) {
          // 忽略无法解析的行(如多行 data 拼接场景)
        }
      }
      return text;
    }
    payload = JSON.parse(trimmed);
  }
  // 非流式 JSON 响应
  if (cfg.apiType === 'anthropic') {
    const err = payload?.error?.message;
    if (err) throw Bob.util.error('api', `接口返回错误: ${err}`, payload);
    const blocks = payload?.content;
    if (Bob.util.isArray(blocks)) return blocks.filter((b: any) => b?.type === 'text').map((b: any) => b?.text ?? '').join('');
    return '';
  }
  return payload?.choices?.[0]?.message?.content ?? '';
}

async function _requestLLM(prompt: string): Promise<{ statusCode: number; text: string }> {
  const cfg = getConfig();
  if (!cfg.apiUrl) throw Bob.util.error('param', '请在插件设置中填写接口地址');

  // ponytail: 统一 stream:true, 兼容只支持流式的本地服务; 非流式服务返回整包 JSON 也能解析
  const body =
    cfg.apiType === 'anthropic'
      ? { model: cfg.model, stream: true, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
      : { model: cfg.model, stream: true, messages: [{ role: 'user', content: prompt }] };

  const [err, res] = await Bob.util.asyncTo<Bob.HttpResponse>(
    Bob.api.$http.post({
      url: cfg.apiUrl,
      timeout: 120000,
      header: buildHeaders(cfg),
      body,
    }),
  );

  if (err) throw Bob.util.error('network', '接口网络错误', err);
  const statusCode = res?.response?.statusCode ?? 0;
  if (statusCode !== 200) {
    const data: any = res?.data;
    const detail = Bob.util.isString(data) ? String(data).slice(0, 300) : JSON.stringify(data ?? '')?.slice(0, 300);
    throw Bob.util.error('api', `接口响应状态错误 (${statusCode}) ${detail}`, data);
  }
  const text = extractText(cfg, res?.data);
  if (!text) throw Bob.util.error('api', '未能从响应中解析出内容', res?.data);
  return { statusCode, text };
}

// 连接测试: 返回结果段落
async function _test(): Promise<Bob.TranslateResult> {
  const cfg = getConfig();
  const { text } = await _requestLLM('请只回复两个字母: ok');
  return {
    from: 'auto',
    to: 'zh-Hans',
    toParagraphs: ['✅ 连接成功', `端点: ${cfg.apiUrl}`, `类型: ${cfg.apiType}  模型: ${cfg.model}`, `回复预览: ${text.slice(0, 100)}`],
  };
}

export function translate(query: Bob.TranslateQuery, completion: Bob.Completion) {
  const text = query.text ?? '';
  const isTest = text.trim().toLowerCase() === 'test' || text.trim() === '测试';

  const job: Promise<Bob.TranslateResult> = isTest
    ? _test()
    : _requestLLM(
        String(Bob.api.getOption('promptTemplate') || '用通俗易懂又简洁的话解释下：$text')
          .replace(/\$(query\.)?text/g, text)
          .replace(/\$(query\.)?to/g, query.detectTo),
      ).then(({ text: reply }) => ({ from: 'auto', to: query.detectTo, toParagraphs: reply.trim().split('\n') }));

  job
    .then((result) => completion({ result }))
    .catch((error) => {
      Bob.api.$log.error(JSON.stringify(error));
      if (error?.type) return completion({ error });
      completion({ error: Bob.util.error('api', '插件出错', error) });
    });
}
