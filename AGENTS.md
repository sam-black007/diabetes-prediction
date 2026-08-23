# AGENTS.md

## Environment & Tooling

- Freebuff workspace root is `.devcontainer/`, not the git repo root. `read_files` and `write_file` resolve paths from there; use `run_terminal_command` with `cd /c/Users/samjo/diabetes-prediction &&` to reach repo files.
- Python on Windows defaults to cp1252. Always use `encoding='utf-8'` in `open()` — this project's files contain Unicode (em dashes, etc.).

## AI Module (`src/ai_agents.py`)

- `API_KEY`, `MODEL`, `PROVIDER`, `BASE_URL` are module-level globals set once at import. Patching `os.environ` after import is too late for `AIClient()`. To test different configs, patch the module globals directly (`ai_agents.API_KEY = ...`) before constructing.
- `.env` loads via `load_dotenv()` at import. Even if you patch env vars, reimporting re-reads `.env` and overwrites them. Tests must explicitly clear `AI_API_KEY` env var or patch the module global.
- `from openai import OpenAI` is lazy (inside `__init__`). Mocking `sys.modules["openai"]` before reimporting doesn't work on Windows. Use `unittest.mock.patch("openai.OpenAI", ...)` around the `AIClient()` call.
- The OpenRouter path uses `"/" in self._model` to detect full model IDs (e.g. `org/model-name`). Bare names without `/` get overridden by the dict default. Any user-set `AI_MODEL` must include the org prefix for OpenRouter.

## Project Structure

- `daily-commit.ps1` targets `D:\random project` — personal automation, not this repo's code.
- `app.py` is 1300+ lines: three tabs (Report, Intake, Assistant), PDF generation, CSS, session state, all business logic in one file. Natural split target.
- Every widget interaction reruns the entire Streamlit script. AI functions called inside `st.spinner` blocks fire on every interaction with no caching — known design gap.
