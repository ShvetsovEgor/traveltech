"""
Prompt Engine: [Базовый стиль] + [Опции из интерфейса] + [Технические параметры].
"""

from __future__ import annotations

from typing import Any

from app.models.enums import AppType

TECHNICAL_IMAGE = (
    "4k resolution, cinematic lighting, highly detailed, professional artwork, "
    "preserve composition from the input sketch."
)

TECHNICAL_PORTRAIT = (
    "4k resolution, cinematic portrait, photorealistic face, sharp focus, "
    "studio quality, preserve facial identity from the input photo."
)

TECHNICAL_VIDEO = (
    "cinematic 16:9, smooth motion, 8 seconds, high quality, natural movement."
)

FACE_LOCK_TAG = "[FACE LOCK: ON]"

# --- Neuro Artist (sketch → painting) ---
ARTIST_STYLES: dict[str, dict[str, Any]] = {
    "vangogh": {
        "base": "Transform the sketch into a post-impressionist oil painting in the style of Vincent van Gogh, swirling brushstrokes, vivid colors.",
    },
    "picasso": {
        "base": "Transform the sketch into a cubist painting in the style of Pablo Picasso, geometric forms, fragmented perspective.",
    },
    "monet": {
        "base": "Transform the sketch into an impressionist painting in the style of Claude Monet, soft light, atmospheric brushwork.",
    },
    "dali": {
        "base": "Transform the sketch into a surrealist painting in the style of Salvador Dalí, dreamlike imagery, symbolic elements.",
    },
    "kandinsky": {
        "base": "Transform the sketch into an abstract composition in the style of Wassily Kandinsky, bold colors, geometric abstraction.",
    },
    "klimt": {
        "base": "Transform the sketch into an art nouveau painting in the style of Gustav Klimt, decorative patterns, gold accents.",
    },
}

# --- Neurobox (photo → stylized portrait) ---
NEUROBOX_STYLES: dict[str, dict[str, Any]] = {
    "anime": {
        "base": "Stylize the portrait as high-quality anime art.",
        "option_map": {
            "Яркие цвета": "vibrant saturated palette",
            "Большие глаза": "large expressive anime eyes",
        },
    },
    "cartoon": {
        "base": "Stylize the portrait as a modern cartoon character.",
        "option_map": {
            "3D стиль": "3D Pixar-style rendering",
            "Пиксельный": "pixel art retro game style",
        },
    },
    "renaissance": {
        "base": "Stylize the portrait as a Renaissance oil painting.",
        "option_map": {
            "Классика": "classical Renaissance composition",
            "Барокко": "dramatic baroque lighting and richness",
        },
    },
    "cyberpunk": {
        "base": "Stylize the portrait as cyberpunk futuristic character.",
        "option_map": {
            "Неон": "neon lights and glowing accents",
            "Темный фон": "dark moody background",
        },
    },
    "zombie": {
        "base": "Stylize the portrait as a zombie character.",
        "option_map": {
            "Страшный": "horror zombie makeup, scary atmosphere",
            "Веселый": "cartoon-friendly zombie, humorous tone",
        },
    },
    "superhero": {
        "base": "Stylize the portrait as a comic book superhero.",
        "option_map": {
            "Marvel": "Marvel cinematic superhero style",
            "DC": "DC comics dramatic superhero style",
        },
    },
}

GENDER_PROMPTS: dict[str, str] = {
    "male": "The subject is male.",
    "female": "The subject is female.",
    "neutral": "Preserve a neutral, androgynous presentation.",
    "other": "Preserve the subject's appearance as in the photo.",
}

# --- Video Magic ---
VIDEO_SCENARIOS: dict[str, dict[str, Any]] = {
    "dancing": {
        "base": "The person from the input image dances energetically.",
        "option_map": {
            "Диско": "on a disco dance floor with colorful lights",
            "Балет": "in an elegant ballet studio",
            "Хип-хоп": "on an urban street with hip-hop vibe",
        },
    },
    "running": {
        "base": "The person from the input image runs forward dynamically.",
        "option_map": {
            "Городская улица": "through a busy city street",
            "Лес": "along a forest trail",
            "Стадион": "on a professional stadium track",
        },
    },
    "singing": {
        "base": "The person from the input image performs singing passionately.",
        "option_map": {
            "Рок-концерт": "on a rock concert stage with crowd",
            "Опера": "in a grand opera house",
            "Караоке": "in a cozy karaoke room",
        },
    },
    "space": {
        "base": "The person from the input image floats and moves in space.",
        "option_map": {
            "Невесомость": "in zero gravity inside a spacecraft",
            "Лунная поверхность": "on the lunar surface in a spacesuit",
            "Станция": "inside a futuristic space station",
        },
    },
}


class PromptEngine:
    """Assembles prompts: base style + UI options + technical suffix."""

    @staticmethod
    def build_artist_prompt(style_id: str, extra_options: list[str] | None = None) -> str:
        cfg = ARTIST_STYLES.get(style_id)
        if not cfg:
            raise ValueError(f"Unknown artist style_id: {style_id}")
        parts = [cfg["base"]]
        if extra_options:
            parts.append(", ".join(extra_options))
        parts.append(TECHNICAL_IMAGE)
        return " ".join(parts)

    @staticmethod
    def build_neurobox_prompt(
        style_id: str,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        cfg = NEUROBOX_STYLES.get(style_id)
        if not cfg:
            raise ValueError(f"Unknown neurobox style_id: {style_id}")
        parts = [cfg["base"]]
        option_map: dict[str, str] = cfg.get("option_map", {})
        if options:
            mapped = [option_map[o] for o in options if o in option_map]
            if mapped:
                parts.append(", ".join(mapped))
        if gender and gender in GENDER_PROMPTS:
            parts.append(GENDER_PROMPTS[gender])
        parts.append(TECHNICAL_PORTRAIT)
        return " ".join(parts)

    @staticmethod
    def build_video_prompt(
        scenario_id: str,
        options: list[str] | None = None,
    ) -> str:
        cfg = VIDEO_SCENARIOS.get(scenario_id)
        if not cfg:
            raise ValueError(f"Unknown video scenario_id: {scenario_id}")
        parts = [FACE_LOCK_TAG, cfg["base"]]
        option_map: dict[str, str] = cfg.get("option_map", {})
        if options:
            mapped = [option_map[o] for o in options if o in option_map]
            if mapped:
                parts.append(", ".join(mapped))
        parts.append(TECHNICAL_VIDEO)
        return " ".join(parts)

    @classmethod
    def build(
        cls,
        app_type: AppType,
        *,
        style_id: str | None = None,
        scenario_id: str | None = None,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        if app_type == AppType.NEURO_ARTIST:
            if not style_id:
                raise ValueError("style_id is required for neuro_artist")
            return cls.build_artist_prompt(style_id, options)
        if app_type == AppType.NEUROBOX:
            if not style_id:
                raise ValueError("style_id is required for neurobox")
            return cls.build_neurobox_prompt(style_id, options, gender)
        if app_type == AppType.VIDEO_MAGIC:
            if not scenario_id:
                raise ValueError("scenario_id is required for video_magic")
            return cls.build_video_prompt(scenario_id, options)
        raise ValueError(f"Unsupported app_type: {app_type}")
