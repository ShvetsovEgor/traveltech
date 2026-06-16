"""
Prompt Engine: [Базовый стиль] + [Опции из интерфейса] + [Технические параметры].

Тексты промптов редактируются в prompts/prompts.json (или путь из PROMPTS_FILE).
"""

from __future__ import annotations

from typing import Any

from app.core.prompt_loader import load_prompts_catalog
from app.models.enums import AppType


class PromptEngine:
    """Assembles prompts: base style + UI options + technical suffix."""

    @staticmethod
    def _catalog(*, force_reload: bool = False) -> dict[str, Any]:
        return load_prompts_catalog(force_reload=force_reload)

    @staticmethod
    def _style_cfg(
        section: str,
        style_id: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Load style config; reload catalog once if cache was stale."""
        catalog = PromptEngine._catalog()
        styles: dict[str, Any] = catalog[section]
        cfg = styles.get(style_id)
        if cfg:
            return catalog, cfg
        catalog = PromptEngine._catalog(force_reload=True)
        styles = catalog[section]
        cfg = styles.get(style_id)
        if not cfg:
            available = ", ".join(sorted(styles))
            if section == "artist_styles":
                raise ValueError(
                    f"Unknown artist style_id: {style_id}. "
                    f"Available: {available}"
                )
            if section == "neurobox_styles":
                raise ValueError(
                    f"Unknown neurobox style_id: {style_id}. "
                    f"Available: {available}"
                )
            raise ValueError(f"Unknown style_id: {style_id}")
        return catalog, cfg

    @staticmethod
    def _map_neurobox_options(cfg: dict[str, Any], options: list[str]) -> list[str]:
        """Resolve UI labels to prompt fragments (flat option_map or option_groups)."""
        option_map: dict[str, str] = cfg.get("option_map", {})
        groups: dict[str, dict[str, str]] = cfg.get("option_groups", {})
        lookup: dict[str, str] = {**option_map}
        for group in groups.values():
            lookup.update(group)
        seen: set[str] = set()
        mapped: list[str] = []
        for label in options:
            fragment = lookup.get(label)
            if fragment and fragment not in seen:
                seen.add(fragment)
                mapped.append(fragment)
        return mapped

    @staticmethod
    def build_artist_prompt(style_id: str, extra_options: list[str] | None = None) -> str:
        catalog, cfg = PromptEngine._style_cfg("artist_styles", style_id)
        parts = [cfg["base"]]
        signature = cfg.get("signature_elements")
        if signature:
            parts.append(signature)
        structure = cfg.get("structure_preserve")
        if structure:
            parts.append(structure)
        if extra_options:
            parts.append(", ".join(extra_options))
        parts.append(catalog["technical"]["image"])
        return " ".join(parts)

    @staticmethod
    def build_neurobox_prompt(
        style_id: str,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        catalog, cfg = PromptEngine._style_cfg("neurobox_styles", style_id)
        cartoon_options: list[str] = cfg.get("cartoon_options", [])
        harmony_options: list[str] = cfg.get("harmony_options", [])
        doll_options: list[str] = cfg.get("doll_options", [])
        cinematic_options: list[str] = cfg.get("cinematic_options", [])
        is_cartoon = bool(
            options and cartoon_options and any(o in cartoon_options for o in options)
        )
        is_harmonized = bool(
            options and harmony_options and any(o in harmony_options for o in options)
        )
        is_doll = bool(
            options and doll_options and any(o in doll_options for o in options)
        )
        is_cinematic = bool(
            options and cinematic_options and any(o in cinematic_options for o in options)
        )
        if is_doll and cfg.get("doll_base"):
            parts = [cfg["doll_base"]]
        elif is_cinematic and cfg.get("cinematic_base"):
            parts = [cfg["cinematic_base"]]
        else:
            parts = [cfg["base"]]
        if options:
            mapped = PromptEngine._map_neurobox_options(cfg, options)
            if mapped:
                parts.append(", ".join(mapped))
        gender_bases: dict[str, str] = cfg.get("gender_bases", {})
        doll_gender_bases: dict[str, str] = cfg.get("doll_gender_bases", {})
        cinematic_gender_bases: dict[str, str] = cfg.get("cinematic_gender_bases", {})
        gender_prompts_style: dict[str, str] = cfg.get("gender_prompts", {})
        global_gender: dict[str, str] = catalog["gender"]
        if gender:
            if is_doll and gender in doll_gender_bases:
                parts[0] = doll_gender_bases[gender]
            elif is_cinematic and gender in cinematic_gender_bases:
                parts[0] = cinematic_gender_bases[gender]
            elif gender in gender_bases:
                parts[0] = gender_bases[gender]
            if gender in gender_prompts_style:
                parts.append(gender_prompts_style[gender])
            elif gender not in gender_bases and gender in global_gender:
                parts.append(global_gender[gender])
        if is_cartoon:
            parts.append(
                catalog["technical"].get(
                    "portrait_cartoon", catalog["technical"]["portrait"]
                )
            )
        elif is_doll:
            parts.append(
                catalog["technical"].get(
                    "portrait_doll", catalog["technical"]["portrait"]
                )
            )
        elif is_cinematic:
            parts.append(
                catalog["technical"].get(
                    "portrait_cinematic", catalog["technical"]["portrait"]
                )
            )
        elif is_harmonized:
            parts.append(
                catalog["technical"].get(
                    "portrait_harmonized", catalog["technical"]["portrait"]
                )
            )
        else:
            parts.append(catalog["technical"]["portrait"])
        return " ".join(parts)

    @staticmethod
    def list_sticker_emotions() -> list[tuple[str, str, str]]:
        """(emotion_id, label, emoji) in catalog order."""
        catalog = PromptEngine._catalog()
        emotions: dict[str, Any] = catalog.get("sticker_emotions", {})
        return [
            (
                emotion_id,
                str(cfg.get("label", emotion_id)),
                str(cfg.get("emoji", "🙂")),
            )
            for emotion_id, cfg in emotions.items()
        ]

    @staticmethod
    def build_sticker_emotion_prompt(emotion_id: str) -> str:
        catalog = PromptEngine._catalog()
        emotions: dict[str, Any] = catalog.get("sticker_emotions", {})
        cfg = emotions.get(emotion_id)
        if not cfg:
            available = ", ".join(sorted(emotions))
            raise ValueError(
                f"Unknown sticker emotion_id: {emotion_id}. Available: {available}"
            )
        parts = [cfg["base"], catalog["technical"]["portrait"]]
        return " ".join(parts)

    @staticmethod
    def build_sticker_grid_prompt() -> str:
        """Один запрос: 2x2 сетка эмоций, затем нарезка на стикеры."""
        catalog = PromptEngine._catalog()
        grid = catalog.get("sticker_grid")
        if not grid:
            raise ValueError("sticker_grid prompt is missing from prompts catalog")
        return f"{grid} {catalog['technical']['portrait']}"

    @staticmethod
    def build_video_prompt(
        scenario_id: str,
        options: list[str] | None = None,
    ) -> str:
        catalog = PromptEngine._catalog()
        scenarios = catalog["video_scenarios"]
        cfg = scenarios.get(scenario_id)
        if not cfg:
            raise ValueError(f"Unknown video scenario_id: {scenario_id}")
        technical = catalog["technical"]
        parts = [technical["face_lock_tag"], cfg["base"]]
        option_map: dict[str, str] = cfg.get("option_map", {})
        if options:
            mapped = [option_map[o] for o in options if o in option_map]
            if mapped:
                parts.append(", ".join(mapped))
        parts.append(technical["portrait"])
        parts.append(technical["video"])
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
        if app_type == AppType.STICKER_PACK:
            if not style_id:
                raise ValueError("emotion_id is required for sticker_pack")
            return cls.build_sticker_emotion_prompt(style_id)
        raise ValueError(f"Unsupported app_type: {app_type}")
