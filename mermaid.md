sequenceDiagram
    actor U as User
    participant M as Mobile App
    participant B as Backend
    participant W as OpenAI Whisper
    participant C as Claude AI

    U->>M: Taps record & speaks
    M->>B: Audio (base64 WAV)

    B->>W: Transcribe speech
    W-->>B: Raw transcription

    B->>C: Correct using learned speech patterns
    C-->>B: Corrected text

    B-->>M: Corrected text
    M-->>U: Shows text & plays audio
