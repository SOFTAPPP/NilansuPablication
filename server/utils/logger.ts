import { AsyncLocalStorage } from 'node:async_hooks';
import chalk from 'chalk';
import util from 'util';

export interface RequestContext {
  reqId: string;
  userId?: string;
  ip?: string;
  startTime: number;
  publication?: string;
  category?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'jwt', 'apikey'];

const maskSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Buffer.isBuffer(obj)) return '[Buffer]';
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  const masked: any = {};
  for (const key in obj) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      masked[key] = '[*** MASKED ***]';
    } else {
      masked[key] = maskSensitiveData(obj[key]);
    }
  }
  return masked;
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const formatTimeTimeOnly = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

const formatMemory = () => {
  const mem = process.memoryUsage();
  return `${Math.round(mem.rss / 1024 / 1024)} MB`;
};

class Logger {
  private formatPayload(payload?: any) {
    if (!payload) return '';
    const masked = maskSensitiveData(payload);
    // Truncate huge payloads for consoles
    let str = util.inspect(masked, { depth: 4, colors: true, breakLength: 80 });
    if (str.length > 2000) {
      str = str.substring(0, 2000) + `\n...[Truncated ${str.length - 2000} more chars]`;
    }
    return `\n${str}`;
  }

  private printBox(title: string, color: chalk.Chalk, emoji: string, fields: Record<string, string | number | undefined>, payload?: any) {
    const isDev = process.env.NODE_ENV !== 'production';
    console.log(color('═══════════════════════════════════════════════════════════════'));
    console.log(color(`${emoji} ${title.toUpperCase()}`));
    console.log(color('═══════════════════════════════════════════════════════════════'));
    
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        const paddedKey = key.padEnd(13, ' ');
        console.log(`${color(paddedKey)} : ${value}`);
      }
    }
    
    if (payload) {
      console.log(this.formatPayload(payload));
    }
    console.log(color('═══════════════════════════════════════════════════════════════\n'));
  }

  private printCompact(title: string, color: chalk.Chalk, emoji: string, fields: Record<string, string | number | undefined>, payload?: any) {
    let line = `${color(emoji)} ${color(title)} | `;
    const parts = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}=${value}`);
      }
    }
    line += parts.join(' | ');
    console.log(line);
    if (payload) {
      console.log(this.formatPayload(payload));
    }
  }

  public startup(port: number, env: string) {
    this.printBox('SERVER STARTED', chalk.cyanBright, '🚀', {
      'Time': formatDate(new Date()),
      'Environment': env,
      'Port': port,
      'Status': 'Running',
      'Memory RSS': formatMemory()
    });
  }

  public shutdown(reason: string) {
    this.printBox('SERVER SHUTDOWN', chalk.magenta, '🛑', {
      'Time': formatDate(new Date()),
      'Reason': reason,
      'Memory RSS': formatMemory()
    });
  }

  public apiRequest(method: string, url: string, status: number, duration: number, responseSize: number, payload?: any) {
    const ctx = requestContext.getStore();
    const title = `${method} ${url}`;
    const emoji = '🌐';
    const isError = status >= 400;
    const color = isError ? chalk.red : (status >= 300 ? chalk.yellow : chalk.green);
    
    console.log(color('──────────────────────────────────────────────────────────────'));
    console.log(`${emoji} ${chalk.bold(title)}`);
    console.log(color('──────────────────────────────────────────────────────────────'));
    
    if (ctx) {
      console.log(`🆔 ${'Request ID'.padEnd(12)} : ${ctx.reqId}`);
      if (ctx.userId) console.log(`👤 ${'User ID'.padEnd(12)} : ${ctx.userId}`);
      if (ctx.publication) console.log(`🏢 ${'Publication'.padEnd(12)} : ${ctx.publication}`);
      if (ctx.category) console.log(`📚 ${'Category'.padEnd(12)} : ${ctx.category}`);
      if (ctx.ip) console.log(`📍 ${'IP Address'.padEnd(12)} : ${ctx.ip}`);
      console.log(`🕒 ${'Started At'.padEnd(12)} : ${formatTimeTimeOnly(new Date(ctx.startTime))}`);
    }

    console.log(`\n📤 Response`);
    console.log(`   ${isError ? '❌' : '✅'} Status    : ${status}`);
    console.log(`   📏 Size      : ${responseSize} Bytes`);
    
    // Highlight slow requests
    let timeStr = `${duration} ms`;
    if (duration > 1000) timeStr = chalk.bgRed.white(` ${timeStr} `) + ' (SLOW)';
    else if (duration > 500) timeStr = chalk.bgYellow.black(` ${timeStr} `);
    console.log(`   ⚡ Total Time: ${timeStr}`);
    
    if (payload) {
      console.log(`   📦 Payload   : ` + this.formatPayload(payload).replace(/\n/g, '\n   '));
    }
    
    console.log(color('──────────────────────────────────────────────────────────────\n'));
  }

  public dbQuery(query: string, duration: number, records?: number) {
    const ctx = requestContext.getStore();
    if (process.env.NODE_ENV === 'production') return; // Do not log all queries in prod
    
    let timeStr = `${duration} ms`;
    if (duration > 100) timeStr = chalk.bgRed.white(` ${timeStr} `) + ' (SLOW)';
    else if (duration > 50) timeStr = chalk.yellow(`${timeStr}`);

    const parts = [
      `⏱️ ${timeStr}`
    ];
    if (records !== undefined) parts.push(`📦 ${records} records`);
    if (ctx) parts.push(`🆔 ${ctx.reqId}`);
    
    // Clean up query for compact logging
    const cleanQuery = query.replace(/\s+/g, ' ').trim().substring(0, 1000);
    
    console.log(`${chalk.blue('🗄️ DATABASE')} | ${parts.join(' | ')}\n   ${chalk.gray(cleanQuery)}`);
  }

  public error(err: any, msg: string = 'ERROR') {
    const ctx = requestContext.getStore();
    const stack = err instanceof Error ? err.stack : undefined;
    const message = err instanceof Error ? err.message : String(err);
    
    console.log(chalk.red('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.red(`❌ ${msg.toUpperCase()}`));
    console.log(chalk.red('═══════════════════════════════════════════════════════════════'));
    
    if (ctx) {
      console.log(`🆔 Request ID : ${ctx.reqId}`);
    }
    console.log(`⚠️ Error      : ${message}`);
    
    if (stack) {
      console.log(`🧩 Stack Trace:\n${chalk.gray(stack)}`);
    } else if (err !== message) {
      console.log(`📦 Details    :` + this.formatPayload(err));
    }
    
    console.log(chalk.red('═══════════════════════════════════════════════════════════════\n'));
  }

  public info(msg: string, payload?: any) {
    const ctx = requestContext.getStore();
    this.printCompact(msg, chalk.blueBright, 'ℹ️', { reqId: ctx?.reqId }, payload);
  }

  public success(msg: string, payload?: any) {
    const ctx = requestContext.getStore();
    this.printCompact(msg, chalk.green, '✅', { reqId: ctx?.reqId }, payload);
  }

  public warn(msg: string, payload?: any) {
    const ctx = requestContext.getStore();
    this.printCompact(msg, chalk.yellow, '⚠️', { reqId: ctx?.reqId }, payload);
  }

  public auth(msg: string, userId?: string) {
    const ctx = requestContext.getStore();
    this.printCompact(msg, chalk.magenta, '🔐', { reqId: ctx?.reqId, user: userId || ctx?.userId });
  }

  public job(msg: string, duration?: number) {
    this.printCompact(msg, chalk.cyan, '🔄', { duration: duration ? `${duration}ms` : undefined });
  }
}

export const logger = new Logger();
