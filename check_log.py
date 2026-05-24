import re
from datetime import datetime
from collections import defaultdict
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np


def parse_log_file(filename='app.log'):
    """Парсит лог-файл и извлекает информацию о картинках и видео"""

    photos = []  # список для хранения времени создания фото
    videos = []  # список для хранения времени создания видео

    # Регулярные выражения для поиска
    photo_pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)Z ✅ Готово! Картина сохранена как static/results/(\w+)\.jpeg'
    video_pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)Z ✅ Готово! Видео сохранено как static/results/(\w+)\.mp4'

    try:
        with open(filename, 'r', encoding='utf-8') as file:
            for line in file:
                # Поиск фото
                photo_match = re.search(photo_pattern, line)
                if photo_match:
                    timestamp_str = photo_match.group(1)
                    timestamp = datetime.fromisoformat(timestamp_str)
                    photos.append(timestamp)
                    continue

                # Поиск видео
                video_match = re.search(video_pattern, line)
                if video_match:
                    timestamp_str = video_match.group(1)
                    timestamp = datetime.fromisoformat(timestamp_str)
                    videos.append(timestamp)

    except FileNotFoundError:
        print(f"Ошибка: Файл {filename} не найден!")
        return None, None
    except Exception as e:
        print(f"Ошибка при чтении файла: {e}")
        return None, None

    return photos, videos


def aggregate_by_day(photos, videos):
    """Агрегирует данные по дням"""
    daily_photos = defaultdict(int)
    daily_videos = defaultdict(int)

    for photo in photos:
        day_key = photo.strftime('%Y-%m-%d')
        daily_photos[day_key] += 1

    for video in videos:
        day_key = video.strftime('%Y-%m-%d')
        daily_videos[day_key] += 1

    # Сортируем по дате
    all_days = sorted(set(daily_photos.keys()) | set(daily_videos.keys()))

    return daily_photos, daily_videos, all_days


def aggregate_by_hour(photos, videos):
    """Агрегирует данные по часам (0-23)"""
    hourly_photos = defaultdict(int)
    hourly_videos = defaultdict(int)

    for photo in photos:
        hour = photo.hour
        hourly_photos[hour] += 1

    for video in videos:
        hour = video.hour
        hourly_videos[hour] += 1

    return hourly_photos, hourly_videos


def calculate_payments_by_day(daily_photos, daily_videos):
    """Рассчитывает выплаты по дням"""
    daily_payments = {}
    photo_rate = 16
    video_rate = 20

    all_days = sorted(set(daily_photos.keys()) | set(daily_videos.keys()))

    for day in all_days:
        photo_count = daily_photos.get(day, 0)
        video_count = daily_videos.get(day, 0)
        daily_payments[day] = (photo_count * photo_rate) + (video_count * video_rate)

    return daily_payments


def calculate_payments_by_hour(hourly_photos, hourly_videos):
    """Рассчитывает выплаты по часам"""
    hourly_payments = {}
    photo_rate = 16
    video_rate = 20

    for hour in range(24):
        photo_count = hourly_photos.get(hour, 0)
        video_count = hourly_videos.get(hour, 0)
        hourly_payments[hour] = (photo_count * photo_rate) + (video_count * video_rate)

    return hourly_payments


def plot_daily_stats(daily_photos, daily_videos, daily_payments, all_days):
    """Строит графики по дням"""
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('Анализ по дням', fontsize=16, fontweight='bold')

    # График 1: Количество файлов по дням (столбчатая диаграмма)
    x = range(len(all_days))
    width = 0.35

    photos_counts = [daily_photos.get(day, 0) for day in all_days]
    videos_counts = [daily_videos.get(day, 0) for day in all_days]

    axes[0, 0].bar([i - width / 2 for i in x], photos_counts, width, label='Картинки', alpha=0.8, color='blue')
    axes[0, 0].bar([i + width / 2 for i in x], videos_counts, width, label='Видео', alpha=0.8, color='red')
    axes[0, 0].set_xlabel('Дата')
    axes[0, 0].set_ylabel('Количество')
    axes[0, 0].set_title('Количество картинок и видео по дням')
    axes[0, 0].set_xticks(x)
    axes[0, 0].set_xticklabels(all_days, rotation=45, ha='right')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # График 2: Выплаты по дням
    payments = [daily_payments[day] for day in all_days]
    axes[0, 1].bar(x, payments, color='green', alpha=0.7, edgecolor='darkgreen', linewidth=2)
    axes[0, 1].set_xlabel('Дата')
    axes[0, 1].set_ylabel('Выплата (руб)')
    axes[0, 1].set_title('Выплаты по дням')
    axes[0, 1].set_xticks(x)
    axes[0, 1].set_xticklabels(all_days, rotation=45, ha='right')
    axes[0, 1].grid(True, alpha=0.3)

    # Добавляем значения на столбцы
    for i, (day, payment) in enumerate(zip(all_days, payments)):
        axes[0, 1].text(i, payment + max(payments) * 0.01, f'{payment}₽',
                        ha='center', va='bottom', fontsize=9)

    # График 3: Накопленные итоги по дням
    cumulative_photos = np.cumsum(photos_counts)
    cumulative_videos = np.cumsum(videos_counts)
    cumulative_total = cumulative_photos + cumulative_videos

    axes[1, 0].plot(all_days, cumulative_photos, 'b-o', label='Картинки', linewidth=2, markersize=6)
    axes[1, 0].plot(all_days, cumulative_videos, 'r-s', label='Видео', linewidth=2, markersize=6)
    axes[1, 0].plot(all_days, cumulative_total, 'g-^', label='Всего', linewidth=2, markersize=6)
    axes[1, 0].set_xlabel('Дата')
    axes[1, 0].set_ylabel('Накопленное количество')
    axes[1, 0].set_title('Накопленное количество файлов по дням')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    axes[1, 0].tick_params(axis='x', rotation=45)

    # График 4: Накопленные выплаты по дням
    cumulative_payments = np.cumsum(payments)
    axes[1, 1].plot(all_days, cumulative_payments, 'purple', marker='D', linewidth=2, markersize=6)
    axes[1, 1].set_xlabel('Дата')
    axes[1, 1].set_ylabel('Накопленная выплата (руб)')
    axes[1, 1].set_title('Накопленные выплаты по дням')
    axes[1, 1].grid(True, alpha=0.3)
    axes[1, 1].tick_params(axis='x', rotation=45)

    # Добавляем значения на график выплат
    for i, (day, cum_pay) in enumerate(zip(all_days, cumulative_payments)):
        axes[1, 1].annotate(f'{int(cum_pay)}₽', (day, cum_pay),
                            textcoords="offset points", xytext=(0, 10), ha='center', fontsize=8)

    plt.tight_layout()
    plt.show()


def plot_hourly_stats(hourly_photos, hourly_videos, hourly_payments):
    """Строит графики по часам"""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle('Анализ по часам (0-23)', fontsize=16, fontweight='bold')

    hours = list(range(24))
    photos_counts = [hourly_photos.get(hour, 0) for hour in hours]
    videos_counts = [hourly_videos.get(hour, 0) for hour in hours]
    payments = [hourly_payments[hour] for hour in hours]

    # График 1: Количество файлов по часам
    width = 0.35
    x = np.arange(len(hours))

    axes[0].bar(x - width / 2, photos_counts, width, label='Картинки', alpha=0.8, color='blue')
    axes[0].bar(x + width / 2, videos_counts, width, label='Видео', alpha=0.8, color='red')
    axes[0].set_xlabel('Час дня')
    axes[0].set_ylabel('Количество')
    axes[0].set_title('Количество файлов по часам')
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(hours)
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # График 2: Выплаты по часам
    axes[1].bar(x, payments, color='green', alpha=0.7, edgecolor='darkgreen', linewidth=2)
    axes[1].set_xlabel('Час дня')
    axes[1].set_ylabel('Выплата (руб)')
    axes[1].set_title('Выплаты по часам')
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(hours)
    axes[1].grid(True, alpha=0.3)

    # График 3: Накопленные выплаты по часам (в течение дня)
    cumulative_payments = np.cumsum(payments)
    axes[2].plot(hours, cumulative_payments, 'purple', marker='D', linewidth=2, markersize=6)
    axes[2].set_xlabel('Час дня')
    axes[2].set_ylabel('Накопленная выплата (руб)')
    axes[2].set_title('Накопленные выплаты в течение дня')
    axes[2].grid(True, alpha=0.3)
    axes[2].set_xticks(hours[::2])

    plt.tight_layout()
    plt.show()


def main():
    # Парсим лог-файл
    photos, videos = parse_log_file('app.log')

    if photos is None or videos is None:
        return

    # Агрегация по дням и часам
    daily_photos, daily_videos, all_days = aggregate_by_day(photos, videos)
    hourly_photos, hourly_videos = aggregate_by_hour(photos, videos)

    # Расчет выплат
    daily_payments = calculate_payments_by_day(daily_photos, daily_videos)
    hourly_payments = calculate_payments_by_hour(hourly_photos, hourly_videos)

    # Общая статистика
    photos_count = len(photos)
    videos_count = len(videos)
    total_payment = (photos_count * 16) + (videos_count * 20)

    # Вывод в консоль
    print("=" * 70)
    print("📊 СТАТИСТИКА ИЗ ЛОГ-ФАЙЛА")
    print("=" * 70)
    print(f"📸 Всего картинок: {photos_count}")
    print(f"🎬 Всего видео: {videos_count}")
    print(f"📦 Всего файлов: {photos_count + videos_count}")
    print()
    print("💰 РАСЧЕТ ВЫПЛАТ:")
    print("-" * 50)
    print(f"🖼️  Картинки: {photos_count} × 16 руб = {photos_count * 16} руб")
    print(f"🎥 Видео: {videos_count} × 20 руб = {videos_count * 20} руб")
    print("-" * 50)
    print(f"💵 ИТОГО: {total_payment} рублей")
    print("=" * 70)
    print()

    # Статистика по дням
    print("📅 СТАТИСТИКА ПО ДНЯМ:")
    print("-" * 70)
    print(f"{'Дата':<12} {'Картинки':<10} {'Видео':<10} {'Всего':<10} {'Выплата':<12}")
    print("-" * 70)
    for day in all_days:
        photos_d = daily_photos.get(day, 0)
        videos_d = daily_videos.get(day, 0)
        total_d = photos_d + videos_d
        payment_d = daily_payments[day]
        print(f"{day:<12} {photos_d:<10} {videos_d:<10} {total_d:<10} {payment_d} руб")
    print("=" * 70)
    print()

    # Статистика по часам (только часы с активностью)
    print("⏰ СТАТИСТИКА ПО ЧАСАМ (часы с активностью):")
    print("-" * 70)
    print(f"{'Час':<8} {'Картинки':<10} {'Видео':<10} {'Всего':<10} {'Выплата':<12}")
    print("-" * 70)
    for hour in range(24):
        photos_h = hourly_photos.get(hour, 0)
        videos_h = hourly_videos.get(hour, 0)
        if photos_h > 0 or videos_h > 0:  # Показываем только часы с активностью
            total_h = photos_h + videos_h
            payment_h = hourly_payments[hour]
            print(f"{hour:02d}:00    {photos_h:<10} {videos_h:<10} {total_h:<10} {payment_h} руб")
    print("=" * 70)
    print()

    # Находим самые продуктивные часы и дни
    if all_days:
        max_day = max(daily_payments.items(), key=lambda x: x[1])
        print(f"🏆 Самый продуктивный день: {max_day[0]} (заработано {max_day[1]} руб)")

    max_hour = max(hourly_payments.items(), key=lambda x: x[1])
    if max_hour[1] > 0:
        print(f"🏆 Самый продуктивный час: {max_hour[0]}:00 (заработано {max_hour[1]} руб)")

    print()

    # Строим графики
    plot_daily_stats(daily_photos, daily_videos, daily_payments, all_days)
    plot_hourly_stats(hourly_photos, hourly_videos, hourly_payments)


if __name__ == "__main__":
    main()