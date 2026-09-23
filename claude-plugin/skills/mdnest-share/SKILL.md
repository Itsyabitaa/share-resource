---
name: mdnest-share
description: Share markdown to md-nest so another person can open a link without copy-paste. Use when the user asks to share, publish, or send a document from Claude via md-nest.
---

When the user wants to share markdown with another person through md-nest:

1. Use the markdown they named, the current artifact, or the latest substantial reply.
2. Call the md-nest connector tool `share_to_mdnest` with that markdown.
3. Leave `is_public` unset or true so the recipient can open the link. Set `is_public` to false only if they explicitly ask to keep it private.
4. Reply with the URL. Say that anyone with the link can read it, unless they asked for private.
