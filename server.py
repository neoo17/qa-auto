import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import pytesseract
from PIL import Image, ImageFilter
import re

load_dotenv()
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def preprocess_image(img):
    img = img.convert('L')  # grayscale
    img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)  # upscale for OCR
    img = img.point(lambda x: 0 if x < 180 else 255, '1')  # увеличенный порог бинаризации
    img = img.filter(ImageFilter.SHARPEN)
    return img

def extract_text(image_path, max_height=3000):
    img = Image.open(image_path)
    img = preprocess_image(img)
    width, height = img.size
    texts = []
    custom_config = r'--oem 3 --psm 6'
    for top in range(0, height, max_height):
        bottom = min(top + max_height, height)
        crop = img.crop((0, top, width, bottom))
        part_text = pytesseract.image_to_string(crop, lang='eng', config=custom_config)
        print(f"OCR block {top}-{bottom}:\n{part_text}")
        texts.append(part_text)
    return "\n".join(texts)

def clean_text(text):
    # Убираем невидимые и нечитабельные символы
    return re.sub(r'[^\x00-\x7Fа-яА-ЯёЁ\s.,!?-]', '', text)

def filter_sentences(text, ignore_keywords=None, min_len=25, min_words=4):
    """
    Оставляет только нормальные предложения:
      - длиннее min_len,
      - минимум min_words слов,
      - заканчиваются на точку, восклицание, вопрос, или последняя в блоке.
    Склеивает короткие строки в одно предложение.
    """
    if not ignore_keywords:
        ignore_keywords = ['review', 'отзыв', 'slider', 'testimonial', 'отзывы', 'customer', 'клиент', 'пользователь', 'testimonials']

    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 0]
    sentences = []
    buf = ""

    for line in lines:
        if any(word.lower() in line.lower() for word in ignore_keywords):
            continue
        # Собираем в буфер, если слишком коротко (по длине и словам)
        current = (buf + " " + line).strip() if buf else line
        words = len(current.split())
        if (len(current) < min_len or words < min_words) and not re.search(r'[.!?]$', line):
            buf = current
            continue
        else:
            sentences.append(current)
            buf = ""

    # Добавим остаток, если это не мусор
    if buf and (len(buf) >= min_len and len(buf.split()) >= min_words):
        sentences.append(buf)

    # Убираем явно мусорные
    filtered = []
    for sent in sentences:
        if (len(sent) >= min_len and len(sent.split()) >= min_words and
            not re.fullmatch(r'[\W_]+', sent) and
            not re.fullmatch(r'[A-ZА-ЯЁ0-9]{1,10}', sent)):
            filtered.append(sent.strip())

    return '\n'.join(filtered)

@app.route('/compare', methods=['POST'])
def compare_images():
    scr = request.files['screenshot']
    ref = request.files['reference']

    scr_path = os.path.join(UPLOAD_FOLDER, 'scr.png')
    ref_path = os.path.join(UPLOAD_FOLDER, 'ref.png')
    scr.save(scr_path)
    ref.save(ref_path)

    # OCR с препроцессингом
    text1 = extract_text(scr_path)
    text2 = extract_text(ref_path)

    # CLEAN
    text1 = clean_text(text1)
    text2 = clean_text(text2)

    # Фильтруем только целые предложения, без мусора
    text1 = filter_sentences(text1)
    text2 = filter_sentences(text2)

    # Если оба текста пустые — считаем "Нет отличий"
    if not text1.strip() and not text2.strip():
        return jsonify({"diff": "Нет отличий", "text1": text1, "text2": text2})

    # Если есть текст только с одной стороны — так и говорим
    if not text1.strip():
        return jsonify({"diff": "Нет текста на скриншоте, только в макете.", "text1": text1, "text2": text2})
    if not text2.strip():
        return jsonify({"diff": "Нет текста в макете, только на скриншоте.", "text1": text1, "text2": text2})

    # ---- LLM (GPT-4o) сравнение ----
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")

    system_prompt = (
        "Ты — автоматический ассистент для QA. Сравнивай два текста, которые получены через OCR с UI-скриншотов. "
        "Игнорируй блоки с отзывами, отзывами пользователей, слайдеры, testimonials. "
        "Игнорируй мелкие OCR-опечатки, разное количество пробелов и переносов, не сравнивай пустые абзацы. "
        "Требую строгий смысловой дифф: если тексты одинаковы по смыслу — выведи 'Нет отличий'. "
        "Если есть отличия, выведи их коротко по формату:\n"
        "- [Отличие] <короткое пояснение>\n"
        "Без вступлений, не группируй, не описывай пустые блоки."
    )
    user_prompt = (
        "Text1 (с OCR скриншота):\n" + text1 + "\n\n"
        "Text2 (с OCR макета):\n" + text2 + "\n\n"
        "Сравни и выведи реальные смысловые отличия, не учитывай блоки с отзывами и testimonials."
    )

    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=1200,
        )
        diff = response.choices[0].message.content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({"diff": diff, "text1": text1, "text2": text2})

if __name__ == '__main__':
    app.run(port=3333)
