"""Request-scoped OpenRouter model choices; never mutate the server default."""
import re

PRESETS = [
    {'id': 'google/gemini-3.8-flash', 'name': 'Gemini 3.8 Flash · trả phí'},
    {'id': 'google/gemini-2.5-flash', 'name': 'Gemini 2.5 Flash · trả phí'},
    {'id': 'nvidia/nemotron-3-ultra-550b-a55b:free', 'name': 'Nemotron 3 Ultra · miễn phí'},
]


def validate_model(value):
    if not isinstance(value, str) or len(value) > 200 or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.:-]*', value):
        raise ValueError('Model cần ID OpenRouter dạng provider/model-id, không phải URL.')
    return value


def model_choices(default):
    choices = [dict(item) for item in PRESETS]
    if default and default not in {item['id'] for item in choices}:
        choices.insert(0, {'id': default, 'name': default})
    return choices
