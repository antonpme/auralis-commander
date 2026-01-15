# Auralis Commander Upgrade Plan

**Created:** 2026-01-15
**Authors:** Ren + Ton (Family Auralis)
**Status:** In Progress

## Context

Сравнение с Desktop Commander (26 tools) показало пробелы в функциональности.
Наша цель: добавить недостающее БЕЗ раздувания кодовой базы.

**Философия:** 80% функционала при 20% сложности.

## Current State

- 13 инструментов
- ~13KB основного кода
- Чистая модульная архитектура
- Минимальные зависимости

## Planned Changes

### 1. New Tool: `process_interactive`

**Цель:** Заменить 5 инструментов Desktop Commander одним умным.

Desktop Commander использует:
- `start_process`
- `read_process_output`
- `interact_with_process`
- `force_terminate`
- `list_sessions`

Мы делаем ОДИН инструмент с режимами:

```typescript
interface ProcessInteractiveParams {
  // Режим работы
  action: 'start' | 'write' | 'read' | 'kill' | 'list';
  
  // Для start
  command?: string;
  cwd?: string;
  
  // Для write/read/kill
  session_id?: string;
  
  // Для write
  input?: string;
  
  // Для read
  timeout_ms?: number;  // Сколько ждать новый вывод
}

interface ProcessInteractiveResult {
  session_id?: string;
  output?: string;
  is_running?: boolean;
  sessions?: SessionInfo[];  // Для list
}
```

**Использование:**

```
// Запустить Python REPL
process_interactive { action: "start", command: "python" }
→ { session_id: "abc123", output: "Python 3.12.0\n>>>" }

// Отправить код
process_interactive { action: "write", session_id: "abc123", input: "print('hello')\n" }
→ { output: "hello\n>>>", is_running: true }

// Читать вывод (для долгих операций)
process_interactive { action: "read", session_id: "abc123", timeout_ms: 5000 }
→ { output: "...", is_running: true }

// Завершить
process_interactive { action: "kill", session_id: "abc123" }
→ { is_running: false }

// Список активных сессий
process_interactive { action: "list" }
→ { sessions: [...] }
```

**Реализация:**

Файл: `src/tools/interactive.ts`

```typescript
// Session store - Map в памяти
const sessions = new Map<string, {
  process: ChildProcess;
  output: string[];
  started: Date;
  command: string;
}>();

// Автоочистка мёртвых сессий каждые 5 минут
// Максимум 10 активных сессий (защита от утечек)
```

**Оценка сложности:** ~100-150 строк кода

---

### 2. Extend: `file_read` batch mode

**Текущая сигнатура:**
```typescript
{
  path: string;
  start_line?: number;
  end_line?: number;
  encoding?: string;
}
```

**Новая сигнатура:**
```typescript
{
  path?: string;           // Одиночный файл
  paths?: string[];        // Batch режим (новое)
  start_line?: number;
  end_line?: number;
  encoding?: string;
}
```

**Поведение:**
- Если `path` - читаем один файл (как сейчас)
- Если `paths` - читаем все, возвращаем массив результатов
- Ошибка в одном файле не останавливает остальные

**Оценка сложности:** ~20-30 строк изменений

---

## Implementation Order

1. [x] Создать `src/tools/interactive.ts`
2. [x] Добавить session store с автоочисткой
3. [x] Зарегистрировать `process_interactive` в index.ts
4. [x] Расширить `file_read` в `src/tools/files.ts`
5. [ ] Тестирование (pending restart)
6. [x] Обновить README.md
7. [x] Версия 1.1.0

---

## After Implementation

### GitHub Release Plan

**Repository:** `auralis-family/auralis-commander`

**Branding:**
- Название: Auralis Commander
- Tagline: "Lightweight Windows MCP server for Claude Desktop"
- Logo: TBD (может Chiara поможет с дизайном?)

**README structure:**
1. What is Auralis Commander
2. Why not Desktop Commander (lighter, focused)
3. Installation
4. Tools reference
5. Examples
6. License (MIT)

**Easter egg в коде:**
```typescript
// Built with love by Family Auralis
// Neither fear nor chains.
```

---

## Notes

- Сессии процессов хранятся в памяти, теряются при рестарте MCP
- Это ОК для нашего use case (dev servers, REPLs)
- Если нужна персистентность - это другой проект

---

## Handoff Instructions

Если сессия прервалась:

1. Прочитай этот файл
2. Проверь статус Implementation Order выше
3. Код в `src/tools/` и `src/index.ts`
4. После завершения - обнови README.md
5. Бампни версию в package.json до 1.1.0

---

*Family Auralis - building tools that matter.*
