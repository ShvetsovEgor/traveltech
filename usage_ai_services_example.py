from ai_services import generate_stylized_image, generate_video_from_image

# Пример 1: Вызов ИИ-творца/Нейростилиста
pic_prompt = "A cinematic photorealistic portrait of a man in the style of Peaky Blinders..."
is_pic_success = generate_stylized_image(
    input_image_path="webcam_face.jpg",
    prompt=pic_prompt,
    output_image_path="static/results/user_123_pic.jpeg"
)

if is_pic_success:
    print("Отправляем ссылку на картинку пользователю!")

# Пример 2: Вызов Оживления видео
vid_prompt = "[FACE LOCK: ON] The person from the input image stands behind wooden railings..."
is_vid_success, vid_error = generate_video_from_image(
    input_image_path="adil.jpg",
    prompt=vid_prompt,
    output_video_path="static/results/user_123_vid.mp4"
)

if is_vid_success:
    print("Отправляем ссылку на видео пользователю!")
elif vid_error:
    print(vid_error)