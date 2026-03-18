import json
import os
import re
from dataclasses import dataclass

try:
    from langchain.prompts import PromptTemplate
    from langchain.memory import ConversationBufferMemory
except Exception:
    PromptTemplate = None
    ConversationBufferMemory = None

try:
    from langchain_anthropic import ChatAnthropic
except Exception:
    ChatAnthropic = None


@dataclass
class EmotionAnalysis:
    primary_emotion: str
    confidence: float
    cues: list[str]


EMOTION_KEYWORDS = {
    'anxiety': ['anxious', 'panic', 'worry', 'nervous', 'overthinking'],
    'depression': ['sad', 'hopeless', 'empty', 'depressed', 'low'],
    'stress': ['stressed', 'pressure', 'burnout', 'overwhelmed', 'tension'],
    'loneliness': ['lonely', 'alone', 'isolated', 'disconnected', 'left out'],
}


class LangChainMentalHealthService:
    def __init__(self):
        self.memory = ConversationBufferMemory(return_messages=True) if ConversationBufferMemory else None
        self.model = None
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if anthropic_key and ChatAnthropic:
            self.model = ChatAnthropic(model='claude-3-5-sonnet-20241022', anthropic_api_key=anthropic_key, temperature=0.2)

        self.emotion_prompt = None
        if PromptTemplate:
            self.emotion_prompt = PromptTemplate.from_template(
                """
                You are a mental health support assistant. Analyze the message and infer emotional category.
                Categories: anxiety, depression, stress, loneliness.
                Message: {message}

                Return strict JSON:
                {{"emotion": "...", "confidence": 0.0, "cues": ["..."]}}
                """.strip()
            )

    def analyze_emotion(self, message: str) -> EmotionAnalysis:
        if self.model and self.emotion_prompt:
            try:
                prompt = self.emotion_prompt.format(message=message)
                raw = self.model.invoke(prompt)
                content = raw.content if hasattr(raw, 'content') else str(raw)
                parsed = json.loads(self._extract_json(content))
                return EmotionAnalysis(
                    primary_emotion=parsed.get('emotion', 'stress'),
                    confidence=float(parsed.get('confidence', 0.5)),
                    cues=parsed.get('cues', []),
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Emotion analysis via LLM failed: {str(e)}. Falling back to keyword-based analysis.")

        lowered = message.lower()
        scores = {}
        for emotion, keywords in EMOTION_KEYWORDS.items():
            scores[emotion] = sum(1 for word in keywords if word in lowered)

        primary = max(scores, key=scores.get) if any(scores.values()) else 'stress'
        cues = [word for word in EMOTION_KEYWORDS[primary] if word in lowered][:3]
        confidence = 0.9 if scores[primary] >= 2 else 0.6
        return EmotionAnalysis(primary_emotion=primary, confidence=confidence, cues=cues)

    def generate_supportive_reply(self, message: str, history: list[dict] | None = None, emotion: str = 'stress') -> str:
        history = history or []
        if self.model:
            try:
                recent = history[-8:]
                history_text = '\n'.join([
                    f"{(m.get('role') or 'user').capitalize()}: {m.get('content', '')}" for m in recent
                ])
                prompt = (
                    "You are HealHive, a warm and concise mental health support assistant. "
                    "Be empathetic, non-judgmental, and avoid diagnosis. "
                    "Keep answers 2-4 short sentences, validate feelings, then ask one gentle follow-up question. "
                    "If risk of harm is mentioned, advise emergency/crisis support.\n\n"
                    f"Detected emotion: {emotion}\n"
                    f"Conversation so far:\n{history_text}\n\n"
                    f"Latest user message: {message}\n\n"
                    "Return only the assistant reply text."
                )
                raw = self.model.invoke(prompt)
                content = raw.content if hasattr(raw, 'content') else str(raw)
                if isinstance(content, list):
                    content = ' '.join([str(x) for x in content])
                content = str(content).strip()
                if content:
                    return content
            except Exception:
                pass

        starters = {
            'anxiety': "That sounds really overwhelming, and it makes sense you're feeling anxious.",
            'depression': "Thank you for sharing that — carrying this can feel very heavy.",
            'stress': "I hear how pressured this feels right now, and you're not alone in that.",
            'loneliness': "It sounds painful to feel this disconnected, and your feelings are valid.",
        }
        followups = {
            'anxiety': "What situation has felt the hardest to manage lately?",
            'depression': "What has your energy and motivation been like over the last few days?",
            'stress': "What part of your day is creating the most pressure right now?",
            'loneliness': "When do you tend to feel most alone during the day?",
        }
        return f"{starters.get(emotion, starters['stress'])} We can take this one step at a time. {followups.get(emotion, followups['stress'])}"

    def route_test(self, emotion: str) -> str:
        mapping = {
            'anxiety': 'GAD7',
            'depression': 'PHQ9',
            'stress': 'PSS',
            'loneliness': 'UCLA',
        }
        return mapping.get(emotion, 'PSS')

    @staticmethod
    def parse_numeric_answer(message: str, max_value: int = 4):
        match = re.search(r'\b([0-4])\b', message)
        if not match:
            return None
        score = int(match.group(1))
        if score > max_value:
            return None
        return score

    @staticmethod
    def _extract_json(text: str) -> str:
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1:
            return '{}'
        return text[start:end + 1]
