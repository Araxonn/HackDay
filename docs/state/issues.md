# Issues

## 2026-10-25 | Stale content scripts after extension reload

Reloading the unpacked extension while ChatGPT is open can invalidate the old content script's Chrome extension context. Storage listener registration and AI-assist reads must tolerate `Extension context invalidated`; users should refresh ChatGPT after reloading the extension.

## 2026-10-25 | Storage callbacks after context invalidation

All storage getters and setters must treat an invalidated extension context as a recoverable stale-tab condition. The storage service now uses safe fallbacks for that condition while preserving rejection for genuine storage failures.
