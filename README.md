# dsh-command-code-usage

**[中文 →](README.zh.md)**

A [Command Code](https://commandcode.ai/) usage monitor for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

> Modeled on **[xueayi/dsh-opencode-go-usage](https://github.com/xueayi/dsh-opencode-go-usage)**.
> If you use **OpenCode Go**, install that one instead — this plugin is a port of it.
> Thanks to [雪阿宜 (xueayi)](https://github.com/xueayi).

## What it does

A floating dock in the corner of the web UI:

- Two rings (5h rolling, weekly) showing remaining quota percent, redder as you spend
- A reset countdown for the 5h window
- Credit balance (subscription / purchased / free)
- Click for a detail panel, draggable, minimal mode
- A failed refresh never blanks it — it keeps the last good numbers

It also registers Command Code as a DSH model provider, so you can use it as a chat model too.

## Usage

**1. Install**

```sh
dsh plugin --profile web add github:cyilin36/dsh-command-code-usage
```

Then restart `dsh web`.

**2. Add your API key**

Pick any one:

- Paste it into the dock
- Settings → Models → Command Code
- Set the `COMMAND_CODE_API_KEY` env var

Get a key at [commandcode.ai](https://commandcode.ai/).

**3. Done**

The dock shows up in the corner. Drag it wherever you like.

## License

MIT
