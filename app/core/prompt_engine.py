"""
Prompt Engine: [Базовый стиль] + [Опции из интерфейса] + [Технические параметры].

Тексты промптов редактируются в prompts/prompts.json (или путь из PROMPTS_FILE).
"""

from __future__ import annotations

import random
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
    def _find_selected_hero(
        cfg: dict[str, Any],
        options: list[str] | None,
    ) -> dict[str, Any] | None:
        roster: list[dict[str, Any]] = cfg.get("hero_roster") or []
        if not options:
            return None
        selected = set(options)
        for hero in roster:
            opt = hero.get("option_label")
            if opt and opt in selected:
                return hero
        return None

    @staticmethod
    def _map_neurobox_options(
        cfg: dict[str, Any],
        options: list[str],
        hero: dict[str, Any] | None = None,
    ) -> list[str]:
        """Resolve UI labels to prompt fragments (flat option_map or option_groups)."""
        option_map: dict[str, str] = cfg.get("option_map", {})
        groups: dict[str, dict[str, str]] = cfg.get("option_groups", {})
        lookup: dict[str, str] = {**option_map}
        for group in groups.values():
            lookup.update(group)
        hero_style: dict[str, str] = (hero or {}).get("style_overrides") or {}
        hero_pose: dict[str, str] = (hero or {}).get("pose_overrides") or {}
        seen: set[str] = set()
        mapped: list[str] = []
        for label in options:
            fragment = (
                hero_style.get(label)
                or hero_pose.get(label)
                or lookup.get(label)
            )
            if fragment and fragment not in seen:
                seen.add(fragment)
                mapped.append(fragment)
        return mapped

    @staticmethod
    def _hero_to_fragment(hero: dict[str, Any]) -> str:
        label = str(hero.get("label", "Original Superhero"))
        costume = str(hero.get("costume", ""))
        background = str(hero.get("background", "epic city skyline"))
        transform_rules = str(hero.get("transform_rules", "")).strip()
        forbidden = str(hero.get("forbidden_elements", "")).strip()
        suffix_parts = [p for p in (transform_rules, forbidden) if p]
        suffix = f" {' '.join(suffix_parts)}" if suffix_parts else ""
        return (
            f"[ORIGINAL SUPERHERO: {label}] "
            f"Create a fully ORIGINAL fictional superhero in the '{label}' visual archetype. "
            f"Costume design: {costume}. Background: {background}. "
            f"Do NOT depict, name, or copy any existing copyrighted character, trademark, "
            f"franchise logo, or recognizable IP from Marvel, DC, Disney, or any film/comic. "
            f"Use unique original emblems and silhouettes only.{suffix}"
        )

    @staticmethod
    def audit_hero_label(style_id: str, options: list[str] | None) -> str | None:
        try:
            _, cfg = PromptEngine._style_cfg("neurobox_styles", style_id)
        except ValueError:
            return None
        hero = PromptEngine._find_selected_hero(cfg, options)
        if not hero:
            return None
        return str(hero.get("option_label") or hero.get("label"))

    @staticmethod
    def build_neurobox_fallback_prompt(
        style_id: str,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str | None:
        _, cfg = PromptEngine._style_cfg("neurobox_styles", style_id)
        hero = PromptEngine._find_selected_hero(cfg, options)
        if not hero:
            return None
        fallback = str(hero.get("fallback_prompt", "")).strip()
        return fallback or None

    @staticmethod
    def _resolve_hero_fragment(
        cfg: dict[str, Any],
        gender: str | None,
        options: list[str] | None,
    ) -> str | None:
        roster: list[dict[str, Any]] = cfg.get("hero_roster") or []
        if not roster:
            return None

        hero = PromptEngine._find_selected_hero(cfg, options)
        if hero:
            return PromptEngine._hero_to_fragment(hero)

        pool = roster
        if gender in ("male", "female"):
            filtered = [
                h for h in roster if h.get("gender", "any") in (gender, "any")
            ]
            if filtered:
                pool = filtered
        return PromptEngine._hero_to_fragment(random.choice(pool))

    @staticmethod
    def extract_assigned_hero(prompt: str) -> str | None:
        for marker in ("[ORIGINAL SUPERHERO:", "[ASSIGNED HERO:"):
            start = prompt.find(marker)
            if start == -1:
                continue
            end = prompt.find("]", start)
            if end == -1:
                continue
            return prompt[start + len(marker) : end].strip()
        return None

    @staticmethod
    def build_artist_prompt(style_id: str, extra_options: list[str] | None = None) -> str:
        catalog, cfg = PromptEngine._style_cfg("artist_styles", style_id)
        technical = catalog["technical"]
        no_sketch = technical.get("artist_no_sketch_lines", "")
        sketch_base = technical.get("artist_sketch_base", "")
        structure = cfg.get("structure_preserve") or technical.get(
            "artist_structure_preserve", ""
        )
        parts = [no_sketch, sketch_base, cfg["base"]]
        signature = cfg.get("signature_elements")
        if signature:
            parts.append(signature)
        if structure:
            parts.append(structure)
        if extra_options:
            parts.append(", ".join(extra_options))
        parts.append(sketch_base)
        parts.append(no_sketch)
        parts.append(technical.get("artist_image", technical["image"]))
        return " ".join(p for p in parts if p)

    @staticmethod
    def build_artist_fallback_prompt(style_id: str) -> str | None:
        catalog, cfg = PromptEngine._style_cfg("artist_styles", style_id)
        technical = catalog["technical"]
        no_sketch = technical.get("artist_no_sketch_lines", "")
        sketch_base = technical.get("artist_sketch_base", "")
        structure = cfg.get("structure_preserve") or technical.get(
            "artist_structure_preserve", ""
        )
        fallback = str(cfg.get("fallback_prompt", "")).strip()
        if fallback:
            return f"{no_sketch} {sketch_base} {fallback} {structure} {no_sketch}"
        return (
            f"{no_sketch} {sketch_base} {cfg['base']} {structure} "
            f"{technical.get('artist_image', technical['image'])} {no_sketch}"
        )

    @staticmethod
    def build_neurobox_prompt(
        style_id: str,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        catalog, cfg = PromptEngine._style_cfg("neurobox_styles", style_id)
        selected_hero = PromptEngine._find_selected_hero(cfg, options)
        cartoon_options: list[str] = cfg.get("cartoon_options", [])
        harmony_options: list[str] = cfg.get("harmony_options", [])
        doll_options: list[str] = cfg.get("doll_options", [])
        cinematic_options: list[str] = cfg.get("cinematic_options", [])
        comic_options: list[str] = cfg.get("comic_options", [])
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
        is_comic = bool(
            options and comic_options and any(o in comic_options for o in options)
        )
        if is_doll and cfg.get("doll_base"):
            parts = [cfg["doll_base"]]
        elif is_comic and cfg.get("comic_base"):
            parts = [cfg["comic_base"]]
        elif is_cinematic and cfg.get("cinematic_base"):
            parts = [cfg["cinematic_base"]]
        else:
            parts = [cfg["base"]]
        if options:
            mapped = PromptEngine._map_neurobox_options(cfg, options, selected_hero)
            if mapped:
                parts.append(", ".join(mapped))
        if selected_hero and selected_hero.get("base_override"):
            parts[0] = str(selected_hero["base_override"])
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
        hero_fragment = PromptEngine._resolve_hero_fragment(cfg, gender, options)
        if hero_fragment:
            parts.append(hero_fragment)
        transform_technical = (
            str(selected_hero.get("transform_technical", "")).strip()
            if selected_hero
            else ""
        )
        if transform_technical:
            parts.append(transform_technical)
        elif is_cartoon:
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
        elif is_comic:
            parts.append(
                catalog["technical"].get(
                    "portrait_comic", catalog["technical"]["portrait"]
                )
            )
        elif is_cinematic:
            parts.append(
                cfg.get("cinematic_technical")
                or catalog["technical"].get(
                    "portrait_cinematic", catalog["technical"]["portrait"]
                )
            )
        elif is_harmonized:
            parts.append(
                cfg.get("harmony_technical")
                or catalog["technical"].get(
                    "portrait_harmonized", catalog["technical"]["portrait"]
                )
            )
        else:
            technical_key = cfg.get("technical_key", "portrait")
            parts.append(
                catalog["technical"].get(
                    technical_key, catalog["technical"]["portrait"]
                )
            )
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
