# Legboss/skills

A Claude Code plugin bundling `grill-with-docs` and `grill-me` (and their shared dependencies `grilling`, `domain-modeling`), plus a `dotfiles/` folder with my personal `~/.claude` setup (status line script, `settings.json`).

## Install the plugin (skills)

```
/plugin marketplace add Legboss/skills
/plugin install grill-with-docs@legboss
```

## dotfiles/ — status line and settings.json

Claude Code plugins can't register a status line automatically (only `agent`/`subagentStatusLine` are supported in a plugin's settings.json), so this is a one-time manual step:

1. Download the script:

   ```bash
   curl -o ~/.claude/statusline.js https://raw.githubusercontent.com/Legboss/skills/main/dotfiles/statusline.js
   ```

2. Add this to `~/.claude/settings.json` (merge if the file already has other keys):

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node ~/.claude/statusline.js"
     }
   }
   ```

Shows: model name, tokens used/total for the context window, percent used, and (when available) percent of the 5-hour rate limit left and time until it resets.

`dotfiles/settings.json` is my full personal `settings.json` as a reference — not meant to be copied verbatim (it includes personal prefs like `theme`/`effortLevel`/`modelSettings`), just useful to see a working example. `CLAUDE.md` (personal instructions) is intentionally NOT included here - kept private.
