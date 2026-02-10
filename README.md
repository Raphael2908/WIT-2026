# WIT-2026 - Sigma Tech v10

Multimodal speech accessibility platform for users with speech impairments.

## Contributors
- Jerome Teoh
- Darren Sim
- Jamison Teng
- Liediana Djoli
- Raphael Lim

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables
Create `backend/.env`:
```
WHISPER_API_KEY=sk-your-openai-key
CLAUDE_API_KEY=sk-ant-your-anthropic-key
```

### Test Services
```bash
# Test Whisper (place test.m4a in backend/)
python test_whisper.py

# Test Claude
python test_claude.py
```

### Requirements
- Python 3.10+
- ffmpeg (for audio conversion): `winget install ffmpeg`
