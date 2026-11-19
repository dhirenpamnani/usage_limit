# usage-limits

A Claude Code mod that shows your Claude plan usage right above the message box, so you
don't have to open Settings to check it:

```
5h session 42%    Weekly 18%
```

- **5h session**: how much of your current 5-hour usage window you've used.
- **Weekly**: how much of your weekly limit you've used.
- Colors: green under 70%, amber from 70%, red from 90%.
- The numbers refresh after every reply from Claude.
- `/limits` opens a side pane with the same figures as bars, plus any separate
  Opus / Sonnet weekly limits your plan reports.

It uses no extra tokens: it never calls the model, it only reads the usage figures
Claude Code already receives with each reply.

Works only when you're signed in with a Claude subscription (Pro / Max). Sessions that
use an API key have no plan limits, so the row stays empty.

## Install

You need [Claude Code](https://claude.com/claude-code) installed.

### Option 1: from a terminal session (recommended)

Start `claude` in a terminal, then type at its prompt:

```
/plugin install usage-limits --marketplace dhirenpamnani/usage_limit
```

1. When asked **Add marketplace?** (`github:dhirenpamnani/usage_limit`), type `y`.
2. Pick the **user** scope (the first one, press Enter) so the mod loads in every session.
3. You'll see `Installed usage-limits. Plugin is now active.`

### Option 2: from your normal shell

```
claude plugin install usage-limits --marketplace dhirenpamnani/usage_limit
```

### Option 3: in the Claude desktop app

`/plugin` doesn't run in the desktop app's Code tab, so:

1. Click **+** next to the prompt box, then **Plugins**.
2. Click **Add marketplace** and enter `dhirenpamnani/usage_limit`.
3. Click **Add plugin** and choose **usage-limits**.

A mod installed from a terminal at the user scope also loads in the desktop app's
local Code sessions.

After installing, the usage row appears above the message box after Claude's first reply
in a session.

## Uninstall

```
claude plugin uninstall usage-limits
```

## License

MIT
